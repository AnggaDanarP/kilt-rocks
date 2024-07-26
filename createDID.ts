import * as Kilt from "@kiltprotocol/sdk-js";
import { mnemonicGenerate } from "@polkadot/util-crypto";

/**
 * =============================================================================
 *                         CREATE ACCOUNT FROM SEED
 * =============================================================================
 */
function generateKeypairs(mnemonic = mnemonicGenerate()): {
  authentication: Kilt.KiltKeyringPair;
  keyAgreement: Kilt.KiltEncryptionKeypair;
  assertionMethod: Kilt.KiltKeyringPair;
  capabilityDelegation: Kilt.KiltKeyringPair;
} {
  const authentication = Kilt.Utils.Crypto.makeKeypairFromUri(mnemonic);

  const assertionMethod = Kilt.Utils.Crypto.makeKeypairFromUri(mnemonic);

  const capabilityDelegation = Kilt.Utils.Crypto.makeKeypairFromUri(mnemonic);

  const keyAgreement = Kilt.Utils.Crypto.makeEncryptionKeypairFromSeed(
    Kilt.Utils.Crypto.mnemonicToMiniSecret(mnemonic)
  );

  return {
    authentication: authentication,
    keyAgreement: keyAgreement,
    assertionMethod: assertionMethod,
    capabilityDelegation: capabilityDelegation,
  };
}

/**
 * =============================================================================
 *                               CREATE LIGHT DID
 * =============================================================================
 */
function createCompleteLightDid({
  authentication,
  keyAgreement,
}: {
  authentication: Kilt.NewLightDidVerificationKey;
  keyAgreement: Kilt.NewDidEncryptionKey;
}): Kilt.DidDocument {
  // Example service for the DID.
  const service: Kilt.DidServiceEndpoint[] = [
    {
      id: "#my-service",
      type: ["KiltPublishedCredentialCollectionV1"],
      serviceEndpoint: ["http://example.domain.org"],
    },
  ];

  // Create the KILT light DID with the information generated.
  const lightDID = Kilt.Did.createLightDidDocument({
    authentication: [authentication],
    keyAgreement: [keyAgreement],
    service,
  });
  //   console.log("DID URI: \n", lightDID.uri);

  return lightDID;
}

/**
 * =============================================================================
 *                               CREATE FULL DID
 * =============================================================================
 */
// from new account direclty for full DID
async function createSimpleFullDid(
  submitterAccount: Kilt.KiltKeyringPair,
  {
    authentication,
  }: {
    authentication: Kilt.NewDidVerificationKey;
  },
  signCallback: Kilt.Did.GetStoreTxSignCallback
): Promise<Kilt.DidDocument> {
  const api = Kilt.ConfigService.get("api");

  // Generate the DID-signed creation tx and submit it to the blockchain with the specified account.
  // The submitter account parameter, ensures that only an entity authorized by the DID subject
  // can submit the tx to the KILT blockchain.
  const fullDidCreationTx = await Kilt.Did.getStoreTx(
    {
      authentication: [authentication],
    },
    submitterAccount.address,
    signCallback
  );

  await Kilt.Blockchain.signAndSubmitTx(fullDidCreationTx, submitterAccount);

  // The new information is fetched from the blockchain and returned.
  const fullDid = Kilt.Did.getFullDidUriFromKey(authentication);
  const encodedUpdatedDidDetails = await api.call.did.query(
    Kilt.Did.toChain(fullDid)
  );

  return Kilt.Did.linkedInfoFromChain(encodedUpdatedDidDetails).document;
}

/**
 * =============================================================================
 *                           IMPLEMENTATION FUNCTION
 * =============================================================================
 */
function createLighDidImplementation(mnemonic = mnemonicGenerate()) {
  const lightAccount = generateKeypairs(mnemonic);
  //   const walletAddress = lightAccount.authentication.address;
  //   const publicKey = lightAccount.authentication.publicKey;

  //   console.log("address: ", walletAddress);
  //   console.log("public key: ", publicKey);

  const lightDid = createCompleteLightDid({
    authentication: {
      publicKey: lightAccount.authentication.publicKey,
      type: "sr25519", // or the type of your key
    },
    keyAgreement: {
      publicKey: lightAccount.keyAgreement.publicKey,
      type: "x25519", // or the type of your key
    },
  });

  console.log("Light DID Document: \n", lightDid);
}

// ! Need token testnet to implementing this full DID
async function creatFullDidImpelemtation(mnemonic = mnemonicGenerate()) {
  const fullAccount = generateKeypairs(mnemonic);
  // Preparing submitter account and signature callback
  const submitterAccount = fullAccount.authentication;

  await Kilt.connect("wss://peregrine.kilt.io/");

  // Checking balance
  const api = Kilt.ConfigService.get("api");
  const { data: balance } = await api.query.system.account(
    submitterAccount.address
  );
  console.log(`Free balance is ${balance.free} KILT`);

  if (balance.free.isZero()) {
    throw new Error("Insufficient balance for transaction");
  }

  const signCallback: Kilt.Did.GetStoreTxSignCallback = async ({ data }) => ({
    signature: submitterAccount.sign(data),
    keyType: submitterAccount.type,
  });

  const fullDidDocument = await createSimpleFullDid(
    submitterAccount,
    {
      authentication: {
        publicKey: fullAccount.authentication.publicKey,
        type: "sr25519",
      },
    },
    signCallback
  );

  await Kilt.disconnect();
  console.log("Full DID Document:", fullDidDocument);
}

async function main() {
  const mnemoniclight = mnemonicGenerate();
  createLighDidImplementation(mnemoniclight);

  const mnemonicFull = mnemonicGenerate();
  creatFullDidImpelemtation(mnemonicFull);
}

main().catch((error) => {
  console.error("Error in main function:", error);
  process.exit(1);
});
