export interface Document {
  id: string;
  title: string;
  category: string;
  decision?: string;
  summary: string;
  source_url: string;
  [key: string]: any;
}

export function formatDocumentText(doc: any, index: number): string {
  const title = doc.title || doc.metadata?.title || "Untitled Document";
  const category = doc.category || doc.metadata?.category || "Uncategorized";
  const decision = doc.decision || doc.metadata?.decision;
  const summary = doc.summary || doc.metadata?.summary || doc.text || "";
  const sourceUrl = doc.source_url || doc.metadata?.source_url || "No source URL";

  const truncatedSummary = summary.length > 200 
    ? summary.substring(0, 197) + "..." 
    : summary;
    
  return `${index}. [${doc.id}] ${title}
   Category: ${category}${decision ? ` | Decision: ${decision}` : ""}
   Summary: ${truncatedSummary}
   Source: ${sourceUrl}`;
}

export function formatResults(dataset: string, docs: Document[], nextCursor?: string): string {
  if (docs.length === 0) {
    return `No documents found in '${dataset}' dataset.`;
  }

  const header = `Found ${docs.length} documents in '${dataset}' dataset.\n\n`;
  const body = docs.map((doc, i) => formatDocumentText(doc, i + 1)).join("\n\n");
  const footer = nextCursor ? `\n\nNext cursor: ${nextCursor}` : "";
  
  return header + body + footer;
}
