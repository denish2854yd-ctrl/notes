"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";
import ApiToken from "./ApiToken";

const SettingsComponent = () => {
  const newPassword = useRef('');
  const handleChangePass = async () => {
    try {
      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPassword.current.value })
      });
      const data = await response.json();
      newPassword.current.value = '';  // Clear the input field after successful password change.
      if (data.success && data.id === 1) {
        toast({ title: "Passwords changed successfully" })
      } else {
        toast({ title: "Failed to change passwords", description: "An error occurred while trying to change the passwords. Please try again later." })
      }
    } catch (error) {
      toast({ title: "Failed to change passwords", description: "An error occurred while trying to change the passwords. Please try again later." })
    }
  }
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 gap-6">
      <div className="bg-card border rounded-xl p-8 shadow-lg max-w-md w-full">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="h-6 w-6" />
          </div>
          <p className="font-bold text-2xl">Change Password</p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="Enter new password"
              ref={newPassword}
            />
          </div>
          <Button
            onClick={handleChangePass}
          >
            Update Password
          </Button>
        </div>
      </div>
      <ApiToken />
    </div>
  )
}

export default SettingsComponent