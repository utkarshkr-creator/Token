"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// tasks/addClaimTask.ts
var config_1 = require("hardhat/config");
var fs = require("fs");
var path = require("path");
// Helper to parse files and format for Solidity call
function parseProofAndInputs(proofPath, publicPath) {
    var proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
    var publicSignals = JSON.parse(fs.readFileSync(publicPath, 'utf8')); // Array of public inputs as strings
    // Order from Circom main public: [commitmentHash, issuerAx, issuerAy, messageHash]
    if (publicSignals.length !== 4) {
        throw new Error("Expected 4 public signals in ".concat(publicPath, ", but got ").concat(publicSignals.length));
    }
    // Format proof components (extract first 2 elements for Solidity verifier)
    var pi_a = [proof.pi_a[0], proof.pi_a[1]];
    // pi_b needs specific formatting/reversal for Groth16 verifier solidity contract
    var pi_b = [
        [proof.pi_b[0][1], proof.pi_b[0][0]], // Inner arrays reversed
        [proof.pi_b[1][1], proof.pi_b[1][0]]
    ];
    var pi_c = [proof.pi_c[0], proof.pi_c[1]];
    var formattedInputs = {
        commitmentHash: publicSignals[0],
        issuerAx: publicSignals[1],
        issuerAy: publicSignals[2],
        messageHash: publicSignals[3],
        a: pi_a,
        b: pi_b,
        c: pi_c
    };
    return formattedInputs;
}
(0, config_1.task)("add-claim", "Adds a claim to the AttributeRegistrySig contract")
    .addParam("registry", "The address of the AttributeRegistrySig contract")
    .addParam("name", "The name of the attribute (e.g., age)")
    .setAction(function (taskArgs, hre) { return __awaiter(void 0, void 0, void 0, function () {
    var registryAddr, attributeName, ethers, buildDir, proofPath, publicPath, callArgs, registryContractName, registry, tx, receipt, error_1, decodedError;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                registryAddr = taskArgs.registry, attributeName = taskArgs.name;
                console.log("Adding claim '".concat(attributeName, "' to registry: ").concat(registryAddr));
                ethers = hre.ethers;
                buildDir = path.join(__dirname, '..', 'build');
                proofPath = path.join(buildDir, 'proof.json');
                publicPath = path.join(buildDir, 'public.json');
                if (!fs.existsSync(proofPath) || !fs.existsSync(publicPath)) {
                    console.error("Error: proof.json or public.json not found in ".concat(buildDir, "."));
                    console.error("Run proof generation steps first.");
                    return [2 /*return*/]; // Use return instead of exit in tasks
                }
                try {
                    callArgs = parseProofAndInputs(proofPath, publicPath);
                    console.log("   Parsed Public Inputs for contract call:");
                    console.log("    Commitment Hash: ".concat(callArgs.commitmentHash.substring(0, 10), "..."));
                    console.log("    Issuer Ax: ".concat(callArgs.issuerAx.substring(0, 10), "..."));
                    console.log("    Issuer Ay: ".concat(callArgs.issuerAy.substring(0, 10), "..."));
                    console.log("    Message Hash: ".concat(callArgs.messageHash.substring(0, 10), "..."));
                }
                catch (error) {
                    console.error("Error parsing proof/public files:", error.message);
                    return [2 /*return*/];
                }
                registryContractName = "AttributeRegistrySig";
                return [4 /*yield*/, ethers.getContractAt(registryContractName, registryAddr)];
            case 1:
                registry = _a.sent();
                // --- Call addClaim ---
                console.log("\n   Submitting addClaim transaction...");
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, , 6]);
                return [4 /*yield*/, registry.addClaim(attributeName, callArgs.issuerAx, callArgs.issuerAy, callArgs.messageHash, callArgs.commitmentHash, callArgs.a, callArgs.b, callArgs.c)];
            case 3:
                tx = _a.sent();
                console.log("   Transaction sent: ".concat(tx.hash));
                console.log("   Waiting for confirmation...");
                return [4 /*yield*/, tx.wait()];
            case 4:
                receipt = _a.sent();
                console.log("   Transaction confirmed! Block: ".concat(receipt === null || receipt === void 0 ? void 0 : receipt.blockNumber, ", Gas Used: ").concat(receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed.toString()));
                console.log("[SUCCESS] Claim should be added to the registry.");
                return [3 /*break*/, 6];
            case 5:
                error_1 = _a.sent();
                console.error("\n   ERROR calling addClaim:", error_1.reason || error_1.message || error_1);
                // Attempt to provide more insight on failure if it's a revert
                if (error_1.data) {
                    try {
                        decodedError = registry.interface.parseError(error_1.data);
                        console.error("   Contract Revert Reason: ".concat(decodedError === null || decodedError === void 0 ? void 0 : decodedError.name, "(").concat(decodedError === null || decodedError === void 0 ? void 0 : decodedError.args.join(', '), ")"));
                    }
                    catch (decodeErr) {
                        console.error("   Could not decode revert reason from error data.");
                    }
                }
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
// module.exports is not needed in TS task files when imported in hardhat.config.ts
