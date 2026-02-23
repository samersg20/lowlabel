import { formatDateTime } from "@/lib/date";
import type { StorageMethod } from "@/lib/constants";

type Input = {
  name: string;
  storageMethod: StorageMethod;
  producedAt: Date;
  expiresAt: Date;
  userName: string;
  sif?: string | null;
};

const truncate = (value: string, max: number) => value.slice(0, max);
const stripAccents = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const sanitize = (value: string) => stripAccents(value).replace(/[\^~]/g, " ");

export function makeZplLabel(input: Input): string {
  const name = sanitize(truncate(input.name, 24));
  const method = sanitize(input.storageMethod);
  const produced = sanitize(formatDateTime(input.producedAt));
  const expires = sanitize(formatDateTime(input.expiresAt));
  const user = sanitize(truncate(input.userName, 14));
  const sif = input.sif ? sanitize(truncate(input.sif, 10)) : "-";

  // 60x60mm @ 203dpi ~= 480x480 dots
  return `^XA
^CI28
^PW480
^LL480
^LH0,0
^FO10,10^GB460,460,2^FS
^FO20,20^A0N,28,28^FDLOW BBQ^FS
^FO20,56^A0N,60,42^FD${name}^FS
^FO20,112^GB440,2,2^FS
^FO20,124^A0N,40,34^FD${method}^FS
^FO20,170^GB440,2,1^FS
^FO20,186^A0N,36,28^FDMANIPULACAO:^FS
^FO265,186^A0N,36,28^FD${produced}^FS
^FO20,232^A0N,36,28^FDVALIDADE:^FS
^FO265,232^A0N,36,28^FD${expires}^FS
^FO20,278^GB440,2,1^FS
^FO20,292^A0N,36,28^FDSIF:^FS
^FO410,292^A0N,36,28^FD${sif}^FS
^FO20,338^A0N,36,28^FDRESP.: ${user}^FS
^XZ`;
}
