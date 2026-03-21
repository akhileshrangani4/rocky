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

type MCPServer = {
  id: string;
  name: string;
  url: string;
  authType: string;
  authToken: string | null;
  headerName: string | null;
  enabled: boolean;
  createdAt: string;
};

export default function MCPPage() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function fetchServers() {
    const res = await fetch("/api/dashboard/admin/mcp");
    if (res.ok) {
      const data = await res.json();
      setServers(data.servers);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchServers();
  }, []);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/dashboard/admin/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        url: form.get("url"),
        authType: form.get("authType"),
        authToken: form.get("authToken") || undefined,
        headerName: form.get("headerName") || undefined,
      }),
    });
    if (res.ok) {
      toast.success("MCP server added");
      setDialogOpen(false);
      fetchServers();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to add server");
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    const res = await fetch("/api/dashboard/admin/mcp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    if (res.ok) {
      toast.success(enabled ? "Server enabled" : "Server disabled");
      fetchServers();
    }
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/dashboard/admin/mcp?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Server removed");
      fetchServers();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MCP Servers</h1>
          <p className="text-muted-foreground">
            Connect external tool servers to extend Rocky&apos;s capabilities.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Add Server
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add MCP Server</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  name="name"
                  id="name"
                  required
                  placeholder="e.g. Vercel, GitHub, My Service"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="url">Server URL</Label>
                <Input
                  name="url"
                  id="url"
                  required
                  placeholder="https://mcp.example.com"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="authType">Auth Type</Label>
                <select
                  name="authType"
                  id="authType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="none"
                >
                  <option value="none">None</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="header">Custom Header</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="authToken">Token / Key</Label>
                <Input
                  name="authToken"
                  id="authToken"
                  type="password"
                  placeholder="Your auth token or API key"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="headerName">
                  Custom Header Name{" "}
                  <span className="text-muted-foreground">(only for Custom Header auth)</span>
                </Label>
                <Input
                  name="headerName"
                  id="headerName"
                  placeholder="e.g. X-API-Key"
                />
              </div>
              <Button type="submit">Add Server</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Servers</CardTitle>
          <CardDescription>
            Rocky loads tools from these servers and makes them available to the
            AI agent. Changes take effect on the next request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : servers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No MCP servers connected. Add one to extend Rocky&apos;s capabilities.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Auth</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell className="font-medium">{server.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground max-w-xs truncate">
                      {server.url}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{server.authType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={server.enabled ? "default" : "secondary"}>
                        {server.enabled ? "enabled" : "disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(server.id, !server.enabled)}
                      >
                        {server.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemove(server.id)}
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
