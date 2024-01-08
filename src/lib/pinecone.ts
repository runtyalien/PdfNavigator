import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { Document, RecursiveCharacterTextSplitter } from "@pinecone-database/doc-splitter"
import { getEmbeddings } from "./embeddings";
import md5 from "md5"

export const getPineconeClient = () => {
  return new Pinecone({
    environment: process.env.PINECONE_ENVIRONMENT!,
    apiKey: process.env.PINECONE_API_KEY!,
  });
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecone(filekey: string) {
  // 1. get the pdf ie download and read from the pdf
  console.log("Downloading s3 into file system...");
  const file_name = await downloadFromS3(filekey);
  if (!file_name) {
    throw new Error("Could not download from s3");
  }

  const loader = new PDFLoader(file_name);
  const pages = (await loader.load()) as PDFPage[];

  //2.split and segment the pdf
  const documents = await Promise.all(pages.map(prepareDocument))

  //3. Vectorising and embedding individual documents
}

async function embedDocument(doc:Document){
  try {
    const embeddings = await getEmbeddings(doc.pageContent)
    const hash = md5(doc.pageContent)

    return {
      id:hash,
      values:embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
      }
    }
  } catch (error) {
    console.log('error embedding document', error);
    throw error
  }
}

export const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder('utf-8').decode(enc.encode(str).slice(0, bytes));
}

async function prepareDocument(page:PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g,'')
  //splitting th docs
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata:{
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000)//as pinecode accepts only 36000 bytes
      }
    })
  ])

  return docs;
}
