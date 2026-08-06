"use client";
import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { createDeposit, createWithdrawal } from "@workspace/api-client-react";

export function AddTransactionForm({ onSuccess }) {
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [transactionType, setTransactionType] = useState<string>("deposit");

  const { toast } = useToast();

  const handleBlur = () => {
    const parsed = parseFloat(amount);

    if (!isNaN(parsed)) {
      setAmount(parsed.toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let result;

      if (transactionType === "deposit") {
        const payload = { depositAmount: amount };
        result = await createDeposit(payload);

        toast({
          title: "Deposit Successful!",
          description: `Amount: $${result.depositAmount}`,
        });

        setAmount("");
        setDate("");
        setTransactionType("deposit");
      } else {
        const payload = { withdrawalAmount: amount };
        result = await createWithdrawal(payload);

        toast({
          title: "Withdrawal Successful!",
          description: `Amount: $${result.withdrawalAmount}`,
        });
      }

      onSuccess();
    } catch (error) {
      toast({
        title: "Transaction failed",
        description: "Something went wrong!",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium">
            Transaction type <span className="text-destructive">*</span>
          </label>
          <Select
            value={transactionType}
            onValueChange={(value) => setTransactionType(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium">
            Amount <span className="text-destructive">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={handleBlur}
            placeholder="Amount"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium">
            Date <span className="text-destructive">*</span>
          </label>
          <Input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2"></div>
        <div className="flex justify-end pt-4 gap-2">
          <Button type="button" variant="ghost" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={false}>
            Save Changes
          </Button>
        </div>
      </div>
    </form>
  );
}
