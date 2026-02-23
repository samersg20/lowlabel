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
^FO20,20^A0N,40,30^FDLOW BBQ^FS
^FO20,64^A0N,76,46^FD${name}^FS
^FO20,126^GB440,2,2^FS
^FO20,138^A0N,52,38^FD${method}^FS
^FO20,188^GB440,2,1^FS
^FO20,202^A0N,46,34^FDMANIPULACAO:^FS
^FO260,202^A0N,46,34^FD${produced}^FS
^FO20,252^A0N,46,34^FDVALIDADE:^FS
^FO260,252^A0N,46,34^FD${expires}^FS
^FO20,302^GB440,2,1^FS
^FO20,316^A0N,46,34^FDSIF:^FS
^FO250,316^FB210,1,0,R^A0N,46,34^FD${sif}^FS
^FO20,366^A0N,46,34^FDRESP.: ${user}^FS
^FO330,430^A0N,28,22^FDLOW BBQ^FS
^XZ`;
}
