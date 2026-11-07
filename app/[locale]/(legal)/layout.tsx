import { LegalFrame } from "@/components/legal/legal-frame";

/** The legal pages share the home page's camera look instead of the site header. */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LegalFrame>{children}</LegalFrame>;
}
