import * as Kilt from "@kiltprotocol/sdk-js";
import axios from "axios";

async function main() {
  // coonection to KILT blockchain
  let api = await Kilt.connect("wss://peregrine.kilt.io/");

  /**
   * =============================================================================
   *                                GET KILT DID
   * =============================================================================
   */
  // get config service
  let apiConfig = Kilt.ConfigService.get("api");
  const encodedKiltnerd123Details = await apiConfig.call.did.queryByWeb3Name(
    "kiltnerd123"
  );

  // This function will throw if kiltnerd123 does not exist
  const {
    document: { uri },
  } = Kilt.Did.linkedInfoFromChain(encodedKiltnerd123Details);
  console.log(`My name is kiltnerd123 and this is my DID: "${uri}"`);
  // output DID: "did:kilt:4q4QzFTs9hKh4QizLB3B7zuGYCG3QPamiBFEgwM6gTM7gK3g"

  /**
   * =============================================================================
   *                     RETRIVE SERVICE ENDPOINTS FOR KILT DID
   * =============================================================================
   */
  // get the document DID
  const kiltnerd123DidDocument = await Kilt.Did.resolve(uri);
  console.log("Kiltnerd123's DID Document: ");
  console.log(JSON.stringify(kiltnerd123DidDocument, null, 2));
  /**
   * Kiltnerd123's DID Document:
{
  "document": {
    "uri": "did:kilt:4q4QzFTs9hKh4QizLB3B7zuGYCG3QPamiBFEgwM6gTM7gK3g",
    "authentication": [
      {
        "id": "#0x7679d80a474c0fb6c2974b3620f66c0d90613308e5497ef923f0823ad7dc02e2",
        "type": "sr25519",
        "publicKey": {
          "0": 94,
          "1": 214,
          "2": 79,
          "3": 119,
          "4": 3,
          "5": 134,
          "6": 143,
          "7": 105,
          "8": 102,
          "9": 50,
          "10": 4,
          "11": 175,
          "12": 5,
          "13": 227,
          "14": 58,
          "15": 225,
          "16": 76,
          "17": 251,
          "18": 242,
          "19": 155,
          "20": 52,
          "21": 7,
          "22": 217,
          "23": 83,
          "24": 251,
          "25": 76,
          "26": 132,
          "27": 84,
          "28": 179,
          "29": 135,
          "30": 0,
          "31": 111
        }
      }
    ],
    "keyAgreement": [
      {
        "id": "#0xa233aa306e51a60dcc547576d1aa937679da8162ef67a116fffb36988a63cee2",
        "type": "x25519",
        "publicKey": {
          "0": 97,
          "1": 34,
          "2": 180,
          "3": 67,
          "4": 53,
          "5": 98,
          "6": 186,
          "7": 207,
          "8": 228,
          "9": 149,
          "10": 43,
          "11": 86,
          "12": 192,
          "13": 12,
          "14": 126,
          "15": 13,
          "16": 111,
          "17": 249,
          "18": 227,
          "19": 233,
          "20": 177,
          "21": 143,
          "22": 249,
          "23": 151,
          "24": 199,
          "25": 157,
          "26": 167,
          "27": 223,
          "28": 171,
          "29": 125,
          "30": 191,
          "31": 2
        }
      }
    ],
    "service": [
      {
        "id": "#my-new-service",
        "type": [
          "KiltPublishedCredentialCollectionV1"
        ],
        "serviceEndpoint": [
          "https://www.new-example.com"
        ]
      }
    ]
  },
  "metadata": {
    "deactivated": false
  },
  "web3Name": "kiltnerd123"
}
   */

  // check the DID is exist
  const endpoints = kiltnerd123DidDocument?.document?.service;
  if (!endpoints) {
    console.log("No endpoints for the DID.");
    return [];
  }

  console.log("Endpoints: ");
  console.log(JSON.stringify(endpoints, null, 2));
  /**
   * Endpoints:
[
  {
    "id": "#my-new-service",
    "type": [
      "KiltPublishedCredentialCollectionV1"
    ],
    "serviceEndpoint": [
      "https://www.new-example.com"
    ]
  }
]
   */

  /**
   * =============================================================================
   *                     GET THE CREDENTIALS AMONG THE ENDPOINTS
   * =============================================================================
   */
  const {
    data: [{ credential }],
  } = await axios.get<Kilt.KiltPublishedCredentialCollectionV1>(
    endpoints[0].serviceEndpoint[0]
  );
  console.log(`Credentials: ${JSON.stringify(credential, null, 2)}`);
  // the output is Undefined because the endpoint(https://www.new-example.com) is not setup properly


  /**
   * =============================================================================
   *                    MAKE SURE VALID AND HAS VALID STRUCTURE
   * =============================================================================
   */

  try {
    const { attester, revoked } = await Kilt.Credential.verifyCredential(
      credential
    );

    // Verify that the credential is not revoked. Exception caught by the catch {} block below.
    if (revoked) {
      throw new Error(
        "The credential has been revoked, hence it is not valid."
      );
    }
    console.log(
      `kiltnerd123's credential is valid and has been attested by ${attester}!`
    );
  } catch {
    // cause the credentials is undefined so this catch block will be executed
    console.log("kiltnerd123's credential is not valid.");
  }

  // check this github link https://github.com/KILTprotocol/spec-KiltPublishedCredentialCollectionV1
  // for more information about defines an extension to the service types supported 
  // in the DID Core W3C spec by defining the KiltPublishedCredentialCollectionV1 service type.


  // disconnect from KILT blockchain
  await Kilt.disconnect();
}

main();
