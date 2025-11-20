// This is our dummy UPI payment gateway function.
// In a real application, this function would contain the logic to interact
// with the Razorpay, Stripe, or PhonePe API.

exports.processPayment = async ({ amount, currency = 'INR', description }) => {
    console.log("--- processPayment START ---");
    console.log("Payment details:", { amount, currency, description });

    // --- SIMULATION LOGIC ---
    // 1. We'll add a small, random delay to simulate network latency.
    const delay = Math.random() * (1500 - 500) + 500; // Delay between 0.5s and 1.5s
    console.log(`Simulating payment processing (delay: ${Math.round(delay)}ms)...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // 2. We will always assume the payment is successful for the MVP.
    const isSuccess = true;

    // 3. We'll generate a fake transaction ID.
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`✓ DUMMY PAYMENT: Processed ${amount} ${currency} for "${description}". Transaction ID: ${transactionId}`);
    console.log("--- processPayment END ---\n");

    // In a real scenario, we might handle isSuccess === false here.
    // For the MVP, we just return the successful transaction details.
    return {
        success: true,
        transactionId: transactionId,
        amount: amount,
        currency: currency,
    };
};
