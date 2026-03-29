import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { config } from "@/lib/config";

export function Profile() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Button 
        onClick={() => navigate(config.routes.dashboard)}
        variant="outline"
        className="mb-4"
      >
        ← Back to Home
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Profile</CardTitle>
          <CardDescription>Manage your profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="John Doe" defaultValue="John Doe" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="john@example.com" defaultValue="john@example.com" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" placeholder="Tell us about yourself" defaultValue="Software developer" />
          </div>
          
          <Button className="w-full">Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
