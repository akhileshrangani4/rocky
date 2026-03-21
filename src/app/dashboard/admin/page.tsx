"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type AllowedUser = {
  id: string;
  platform: string;
  platformUserId: string;
  platformUsername: string | null;
  createdAt: string;
};

const platforms = ["slack", "discord", "github", "linear", "telegram"] as const;

export default function AdminPage() {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function fetchUsers() {
    const res = await fetch("/api/dashboard/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/dashboard/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: form.get("platform"),
        platformUserId: form.get("platformUserId"),
        platformUsername: form.get("platformUsername") || undefined,
      }),
    });
    if (res.ok) {
      toast.success("User added");
      setDialogOpen(false);
      fetchUsers();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to add user");
    }
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/dashboard/admin/users?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("User removed");
      fetchUsers();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground">
            Manage who can interact with Rocky across platforms.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Add User
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Allowed User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="platform">Platform</Label>
                <select
                  name="platform"
                  id="platform"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {platforms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="platformUserId">Platform User ID</Label>
                <Input
                  name="platformUserId"
                  id="platformUserId"
                  required
                  placeholder="e.g. U0123ABC456"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="platformUsername">Username (optional)</Label>
                <Input
                  name="platformUsername"
                  id="platformUsername"
                  placeholder="e.g. @johndoe"
                />
              </div>
              <Button type="submit">Add</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allowed Users</CardTitle>
          <CardDescription>
            Only these users can interact with Rocky on their respective
            platforms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No users added yet. Add your platform user IDs to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Badge variant="outline">{user.platform}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {user.platformUserId}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.platformUsername ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemove(user.id)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
