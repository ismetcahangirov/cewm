import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("az"))
    .join("");
}

export function UserAvatar({ name }: { name: string }) {
  return (
    <Avatar className="size-8">
      <AvatarFallback className="bg-sand text-meta text-black">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
