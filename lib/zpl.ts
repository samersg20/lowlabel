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
  const sif = input.sif ? sanitize(truncate(input.sif, 14)) : "-";

  // 60x60mm @ 203dpi ~= 480x480 dots
  return `^XA
^CI28
^PW480
^LL480
^LH0,0
^FO10,10^GB460,460,2^FS
^FO20,20^A0N,50,30^FDLOW BBQ^FS
^FO20,78^A0N,70,40^FD${name}^FS
^FO20,132^GB440,2,2^FS
^FO20,144^A0N,56,34^FD${method}^FS
^FO20,194^GB440,2,1^FS
^FO20,208^A0N,48,30^FDMANIPULACAO:^FS
^FO260,208^A0N,48,30^FD${produced}^FS
^FO20,256^A0N,48,30^FDVALIDADE:^FS
^FO260,256^A0N,48,30^FD${expires}^FS
^FO20,304^GB440,2,1^FS
^FO20,318^A0N,48,30^FDSIF:^FS
^FO250,318^FB210,1,0,R^A0N,48,30^FD${sif}^FS
^FO20,366^A0N,48,30^FDRESP.: ${user}^FS
^XZ`;
}
