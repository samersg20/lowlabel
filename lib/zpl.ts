import { formatDateTime } from "@/lib/date";
import type { StorageMethod } from "@/lib/constants";

type Input = {
  name: string;
  storageMethod: StorageMethod;
  producedAt: Date;
  expiresAt: Date;
  userName: string;
  sif?: string | null;
  notes?: string | null;
};

const truncate = (value: string, max: number) => value.slice(0, max);
const sanitize = (value: string) => value.normalize("NFC").replace(/[\^~]/g, " ");

export function makeZplLabel(input: Input): string {
  const name = sanitize(truncate(input.name, 32));
  const method = sanitize(input.storageMethod);
  const produced = sanitize(formatDateTime(input.producedAt));
  const expires = sanitize(formatDateTime(input.expiresAt));
  const user = sanitize(truncate(input.userName, 24));
  const sif = input.sif ? sanitize(truncate(input.sif, 24)) : "";
  const notes = input.notes ? sanitize(truncate(input.notes, 45)) : "";

  return `^XA
^CI28
^PW480
^LL320
^FO20,20^A0N,42,42^FD${name}^FS
^FO20,70^A0N,30,30^FDMétodo: ${method}^FS
^FO20,110^A0N,24,24^FDProdução: ${produced}^FS
^FO20,145^A0N,24,24^FDValidade: ${expires}^FS
^FO20,180^A0N,24,24^FDResponsável: ${user}^FS
${sif ? `^FO20,215^A0N,22,22^FDSIF: ${sif}^FS` : ""}
${notes ? `^FO20,245^A0N,20,20^FDObs: ${notes}^FS` : ""}
^XZ`;
}
