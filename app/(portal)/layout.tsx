import { Shell } from "@/components/shell";
import { CommandMenu } from "@/components/command-menu";

export default function PortalLayout({ children, drawer }: { children: React.ReactNode; drawer: React.ReactNode }) {
  return (
    <Shell>
      {children}
      {drawer}
      <CommandMenu />
    </Shell>
  );
}
