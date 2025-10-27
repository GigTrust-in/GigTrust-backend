use actix_web::{post, web, App, HttpResponse, HttpServer, Responder};
use dotenv::dotenv;
use ethers::prelude::*;
use serde::Deserialize;
use std::env;
use std::sync::Arc;
use std::time::Duration;

mod job_escrow;
use job_escrow::JobEscrow;

#[derive(Deserialize, Debug)]
struct FundRequest {
    job_id: u64,
    provider_address: String,
    amount_in_matic: String,
}

#[derive(Deserialize, Debug)]
struct ReleaseRequest {
    job_id: u64,
}

// Simulated KMS function for NFR-SEC-02
async fn get_signer_from_kms(chain_id: u64) -> Result<LocalWallet, String> {
    println!("[KMS] Simulating secure key retrieval...");
    let private_key = env::var("PRIVATE_KEY").map_err(|_| "PRIVATE_KEY not found")?;
    let wallet = private_key
        .parse::<LocalWallet>()
        .map_err(|e| format!("Failed to parse private key: {}", e))?
        .with_chain_id(chain_id);
    Ok(wallet)
}

#[post("/fund-escrow")]
async fn fund_escrow_handler(req: web::Json<FundRequest>) -> impl Responder {
    let rpc_url = env::var("POLYGON_RPC_URL").expect("Config error");
    let contract_addr = env::var("ESCROW_CONTRACT_ADDRESS").expect("Config error");
    
    let provider = Provider::<Http>::try_from(rpc_url).unwrap();
    let wallet = match get_signer_from_kms(80001u64).await {
        Ok(w) => w,
        Err(e) => return HttpResponse::InternalServerError().body(e),
    };
    let client = Arc::new(SignerMiddleware::new(provider, wallet));
    let contract = JobEscrow::new(contract_addr.parse::<Address>().unwrap(), Arc::clone(&client));

    let job_id = U256::from(req.job_id);
    let provider_addr = req.provider_address.parse::<Address>().unwrap();
    let value_in_wei = ethers::utils::parse_ether(&req.amount_in_matic).unwrap();

    let tx = contract.fund_escrow(job_id, provider_addr).value(value_in_wei);
    println!("[TX] Sending tx to fund escrow for job {}", req.job_id);

    // Using a simple send without retry for funding
    match tx.send().await {
        Ok(pending_tx) => match pending_tx.await {
            Ok(Some(receipt)) => HttpResponse::Ok().json(serde_json::json!({ "transactionHash": receipt.transaction_hash })),
            _ => HttpResponse::InternalServerError().body("Tx failed"),
        },
        Err(e) => HttpResponse::InternalServerError().body(format!("Tx error: {}", e)),
    }
}

#[post("/release-funds")]
async fn release_funds_handler(req: web.Json<ReleaseRequest>) -> impl Responder {
    let rpc_url = env::var("POLYGON_RPC_URL").expect("Config error");
    let contract_addr = env::var("ESCROW_CONTRACT_ADDRESS").expect("Config error");

    let provider = Provider::<Http>::try_from(rpc_url).unwrap();
    let wallet = match get_signer_from_kms(80001u64).await {
        Ok(w) => w,
        Err(e) => return HttpResponse::InternalServerError().body(e),
    };
    let client = Arc::new(SignerMiddleware::new(provider, wallet));
    let contract = JobEscrow::new(contract_addr.parse::<Address>().unwrap(), Arc::clone(&client));

    let tx = contract.release_funds_to_operator(U256::from(req.job_id));
    println!("[TX] Sending tx to release funds for job {}", req.job_id);

    // NFR-REL-02: Retry mechanism
    const MAX_RETRIES: u32 = 3;
    for i in 0..MAX_RETRIES {
        match tx.clone().send().await {
            Ok(pending_tx) => match pending_tx.await {
                Ok(Some(receipt)) => {
                    return HttpResponse::Ok().json(serde_json::json!({ "transactionHash": receipt.transaction_hash }));
                },
                _ => eprintln!("[Retry] Attempt {} failed: Tx dropped", i + 1),
            },
            Err(e) => eprintln!("[Retry] Attempt {} failed: {}", i + 1, e),
        }
        tokio::time::sleep(Duration::from_secs(2)).await;
    }
    HttpResponse::InternalServerError().body("Failed after retries")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    println!("🦀 Rust Crypto Service listening on http://127.0.0.1:8080");
    HttpServer::new(|| {
        App::new()
            .service(fund_escrow_handler)
            .service(release_funds_handler)
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
