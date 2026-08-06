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

export function DepositWithdrawalForm({ onSuccess }) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (transactionType === "deposit") {
      const payload = { depositAmount: amount };
      createDeposit(payload);
    } else {
      const payload = { withdrawalAmount: amount };
      createWithdrawal(payload);
    }
    toast({ title: "Transaction logged" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium">Transaction type</label>
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
          <label className="text-xs font-medium">Amount</label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={handleBlur}
            placeholder="Amount"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium">Date</label>
          <Input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
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
