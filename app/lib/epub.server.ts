import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

export interface EpubMetadata {
  title: string;
  coverImageBuffer?: Buffer;
  coverImageMimeType?: string;
  coverImageFileName?: string;
}

export async function extractEpubMetadata(fileBuffer: Buffer): Promise<EpubMetadata> {
  const zip = await JSZip.loadAsync(fileBuffer);
  
  // 1. Find the root file (OPF) from META-INF/container.xml
  const containerXmlFile = zip.file("META-INF/container.xml");
  if (!containerXmlFile) {
    throw new Error("Invalid EPUB: Missing META-INF/container.xml");
  }

  const containerXmlString = await containerXmlFile.async("string");
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXmlString, "text/xml");
  
  const rootfiles = containerDoc.getElementsByTagName("rootfile");
  if (rootfiles.length === 0) {
    throw new Error("Invalid EPUB: No rootfile found in container.xml");
  }
  
  const opfPath = rootfiles[0].getAttribute("full-path");
  if (!opfPath) {
    throw new Error("Invalid EPUB: full-path attribute missing in container.xml");
  }

  // 2. Parse the OPF file
  const opfFile = zip.file(opfPath);
  if (!opfFile) {
    throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`);
  }

  const opfString = await opfFile.async("string");
  const opfDoc = parser.parseFromString(opfString, "text/xml");
  
  // 3. Extract Title
  let title = "Unknown Title";
  const titleElements = opfDoc.getElementsByTagName("dc:title");
  if (titleElements.length > 0 && titleElements[0].textContent) {
    title = titleElements[0].textContent;
  }

  // 4. Extract Cover Image
  let coverImageBuffer: Buffer | undefined;
  let coverImageMimeType: string | undefined;
  let coverImageFileName: string | undefined;

  const metaElements = opfDoc.getElementsByTagName("meta");
  let coverId: string | null = null;
  
  for (let i = 0; i < metaElements.length; i++) {
    const name = metaElements[i].getAttribute("name");
    if (name === "cover") {
      coverId = metaElements[i].getAttribute("content");
      break;
    }
  }

  if (coverId) {
    const itemElements = opfDoc.getElementsByTagName("item");
    let coverHref: string | null = null;
    
    for (let i = 0; i < itemElements.length; i++) {
      if (itemElements[i].getAttribute("id") === coverId) {
        coverHref = itemElements[i].getAttribute("href");
        coverImageMimeType = itemElements[i].getAttribute("media-type") || undefined;
        break;
      }
    }

    if (coverHref) {
      // Resolve path relative to OPF file
      const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";
      const coverPath = opfDir + coverHref;
      
      const coverFile = zip.file(coverPath);
      if (coverFile) {
        coverImageBuffer = await coverFile.async("nodebuffer");
        coverImageFileName = coverHref.split("/").pop();
      }
    }
  }

  return {
    title,
    coverImageBuffer,
    coverImageMimeType,
    coverImageFileName,
  };
}
