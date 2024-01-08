import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function convertToAscii(inputString: string){
  //to remove all non-ASCII characters
  const asciiString = inputString.replace(/[^\x00-\x&F]/g, "");
  return asciiString;
}