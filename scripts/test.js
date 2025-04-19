import { buildEddsa } from 'circomlibjs';
import * as crypto from 'crypto';

async function testSign() {
    try {
        const eddsa = await buildEddsa();
        const prv = crypto.randomBytes(32);
        // Create a known, simple message hash BigInt for testing
        const msg = BigInt(12345); // Or BigInt(0), BigInt(1) etc.
        console.log("Testing signPoseidon with simple message:", msg);
        const sig = eddsa.signPoseidon(prv, msg);
        console.log("Signing test successful! Signature S:", sig.S.toString());
    } catch (e) {
        console.error("Minimal signing test FAILED:", e);
    }
}
testSign();
