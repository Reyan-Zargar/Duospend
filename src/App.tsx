import { useState } from "react";
import "./App.css";

type PaidBy = "You" | "Partner";
type ExpenseFor = "Both" | "You" | "Partner";

type Transaction = {
  id: number;
  title: string;
  category: string;
  date: string;
  amount: number;
  paidBy: PaidBy;
  expenseFor: ExpenseFor;
  icon: string;
};

const initialTransactions: Transaction[] = [
  {
    id: 1,
    title: "Groceries",
    category: "Household",
    date: "Today, 10:32 AM",
    amount: 840,
    paidBy: "You",
    expenseFor: "Both",
    icon: "🛒",
  },
  {
    id: 2,
    title: "Electricity",
    category: "Bills",
    date: "Yesterday",
    amount: 1240,
    paidBy: "Partner",
    expenseFor: "Both",
    icon: "⚡",
  },
  {
    id: 3,
    title: "Chicken & vegetables",
    category: "Groceries",
    date: "Aug 31",
    amount: 560,
    paidBy: "You",
    expenseFor: "Both",
    icon: "🥬",
  },
];

const categoryIcons: Record<string, string> = {
  Groceries: "🛒",
  Food: "🍽️",
  Housing: "🏠",
  Bills: "⚡",
  Household: "🧼",
  Transport: "🚕",
  Entertainment: "🎮",
  Personal: "👤",
  Other: "📦",
};

function App() {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);

  const [showAddExpense, setShowAddExpense] = useState(false);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [paidBy, setPaidBy] = useState<PaidBy>("You");
  const [expenseFor, setExpenseFor] = useState<ExpenseFor>("Both");

  const [balance, setBalance] = useState(2840);

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString("en-IN")}`;

  const openAddExpense = () => {
    setAmount("");
    setDescription("");
    setCategory("Groceries");
    setPaidBy("You");
    setExpenseFor("Both");
    setShowAddExpense(true);
  };

  const closeAddExpense = () => {
    setShowAddExpense(false);
  };

  const addExpense = () => {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0 || !description.trim()) {
      return;
    }

    const newTransaction: Transaction = {
      id: Date.now(),
      title: description.trim(),
      category,
      date: "Just now",
      amount: numericAmount,
      paidBy,
      expenseFor,
      icon: categoryIcons[category] ?? "📦",
    };

    setTransactions((current) => [newTransaction, ...current]);

    // For a shared 50/50 expense:
    // if you pay, your partner owes you half.
    // if your partner pays, you owe them half.
    if (expenseFor === "Both") {
      const sharedAmount = numericAmount / 2;

      if (paidBy === "You") {
        setBalance((current) => current + sharedAmount);
      } else {
        setBalance((current) => current - sharedAmount);
      }
    }

    setShowAddExpense(false);
  };

  const totalSpent = transactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );

  return (
    <div className="app-shell">
      <main className="app">
        <header className="topbar">
          <div>
            <p className="eyebrow">DUOSPEND</p>
            <h1>Good morning, Reyan</h1>
          </div>

          <button className="avatar" aria-label="Profile">
            R
          </button>
        </header>

        <section className="balance-card">
          <div className="balance-top">
            <div>
              <p className="balance-label">CURRENT BALANCE</p>
              <h2>
                {formatCurrency(Math.abs(balance))}
              </h2>
            </div>

            <span
              className={
                balance >= 0
                  ? "balance-status"
                  : "balance-status negative"
              }
            >
              ● {balance >= 0 ? "You are owed" : "You owe"}
            </span>
          </div>

          <p className="balance-description">
            {balance >= 0
              ? "Your partner owes you this amount."
              : "You owe your partner this amount."}
          </p>

          <button className="settle-button">Settle up</button>
        </section>

        <section className="summary-grid">
          <div className="summary-card">
            <span className="summary-icon">↗</span>
            <p>Total spent</p>
            <strong>{formatCurrency(totalSpent)}</strong>
            <small>This month</small>
          </div>

          <div className="summary-card">
            <span className="summary-icon">◐</span>
            <p>Your share</p>
            <strong>₹5,630</strong>
            <small>This month</small>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">AUGUST 2026</p>
              <h3>Recent activity</h3>
            </div>

            <button className="view-all">View all</button>
          </div>

          <div className="transaction-list">
            {transactions.map((transaction) => (
              <article className="transaction" key={transaction.id}>
                <div className="transaction-icon">
                  {transaction.icon}
                </div>

                <div className="transaction-info">
                  <h4>{transaction.title}</h4>
                  <p>
                    {transaction.category} · {transaction.date}
                  </p>
                </div>

                <div className="transaction-amount">
                  <strong>{formatCurrency(transaction.amount)}</strong>
                  <span>
                    {transaction.paidBy === "You"
                      ? "You paid"
                      : "Partner paid"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <button className="add-expense" onClick={openAddExpense}>
          <span>+</span>
          Add expense
        </button>

        <nav className="bottom-nav">
          <button className="nav-item active">
            <span>⌂</span>
            <small>Home</small>
          </button>

          <button className="nav-item">
            <span>≡</span>
            <small>Activity</small>
          </button>

          <button
            className="nav-add"
            aria-label="Add expense"
            onClick={openAddExpense}
          >
            +
          </button>

          <button className="nav-item">
            <span>◔</span>
            <small>Insights</small>
          </button>

          <button className="nav-item">
            <span>⚙</span>
            <small>Settings</small>
          </button>
        </nav>
      </main>

      {showAddExpense && (
        <div className="modal-backdrop" onClick={closeAddExpense}>
          <section
            className="expense-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="section-kicker">NEW TRANSACTION</p>
                <h2>Add expense</h2>
              </div>

              <button
                className="close-button"
                onClick={closeAddExpense}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="amount-input-wrapper">
              <span>₹</span>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>

            <label className="field">
              <span>What was it?</span>
              <input
                type="text"
                placeholder="e.g. Chicken, rent, groceries"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option>Groceries</option>
                <option>Food</option>
                <option>Housing</option>
                <option>Bills</option>
                <option>Household</option>
                <option>Transport</option>
                <option>Entertainment</option>
                <option>Personal</option>
                <option>Other</option>
              </select>
            </label>

            <div className="field">
              <span>Paid by</span>

              <div className="segmented-control">
                <button
                  className={paidBy === "You" ? "selected" : ""}
                  onClick={() => setPaidBy("You")}
                >
                  You
                </button>

                <button
                  className={paidBy === "Partner" ? "selected" : ""}
                  onClick={() => setPaidBy("Partner")}
                >
                  Partner
                </button>
              </div>
            </div>

            <div className="field">
              <span>Expense is for</span>

              <div className="segmented-control three">
                <button
                  className={expenseFor === "Both" ? "selected" : ""}
                  onClick={() => setExpenseFor("Both")}
                >
                  Both
                </button>

                <button
                  className={expenseFor === "You" ? "selected" : ""}
                  onClick={() => setExpenseFor("You")}
                >
                  Just me
                </button>

                <button
                  className={expenseFor === "Partner" ? "selected" : ""}
                  onClick={() => setExpenseFor("Partner")}
                >
                  Partner
                </button>
              </div>
            </div>

            {expenseFor === "Both" && (
              <div className="split-preview">
                <span>50 / 50 split</span>
                <strong>
                  {amount
                    ? `${formatCurrency(Number(amount) / 2)} each`
                    : "Enter an amount"}
                </strong>
              </div>
            )}

            <button
              className="save-expense"
              onClick={addExpense}
              disabled={!amount || !description.trim()}
            >
              Save expense
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;