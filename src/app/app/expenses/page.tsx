import { redirect } from "next/navigation";

export default function ExpensesPage() {
  redirect("/app/ledger#expenses");
}
