"use client";

import { signOut } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function UserNav({
  name,
  email,
  image,
  role,
}: {
  name: string;
  email: string;
  image?: string;
  role: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative h-8 w-8 rounded-full">
        <Avatar className="h-8 w-8">
          <AvatarImage src={image} alt={name} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium leading-none">{name}</p>
                {role === "admin" && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    admin
                  </Badge>
                )}
              </div>
              <p className="text-xs leading-none text-muted-foreground">
                {email}
              </p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() =>
              signOut({
                fetchOptions: {
                  onSuccess: () => window.location.replace("/sign-in"),
                },
              })
            }
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
