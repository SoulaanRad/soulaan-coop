import { PinataSDK } from "pinata-web3";
import { env } from "../env.js";

export const pinata = new PinataSDK({
  pinataJwt: env.PINATA_JWT,
});

/**
 * Upload a file to IPFS via Pinata
 * @param file - File buffer or stream
 * @param filename - Original filename
 * @returns CID (Content Identifier)
 */
export async function uploadToPinata(file: Buffer, filename: string): Promise<string> {
  try {
    console.log(`📤 Uploading file to IPFS: ${filename}`);

    // Convert buffer to File object
    const blob = new Blob([file]);
    const fileObject = new File([blob], filename);

    // Upload to Pinata
    const upload = await pinata.upload.file(fileObject);

    const cid = upload.IpfsHash;
    console.log(`✅ File uploaded successfully. CID: ${cid}`);

    return cid;
  } catch (error) {
    console.error('❌ Error uploading to Pinata:', error);
    throw new Error(`Failed to upload file to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the public URL for an IPFS CID
 * @param cid - IPFS Content Identifier
 * @returns Public gateway URL
 */
export function getIPFSUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

/**
 * Delete/unpin a file from Pinata (optional - for cleanup)
 * @param cid - IPFS Content Identifier
 */
export async function unpinFromPinata(cid: string): Promise<void> {
  try {
    await pinata.unpin([cid]);
    console.log(`🗑️ Unpinned file: ${cid}`);
  } catch (error) {
    console.error('❌ Error unpinning from Pinata:', error);
    // Don't throw - unpinning is not critical
  }
}
