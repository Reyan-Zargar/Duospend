import { useState } from "react";
import "./App.css";

type PaidBy = "You" | "Partner";
type ExpenseFor = "Both" | "You" | "Partner";
type Screen = "home" | "activity" | "insights";

type Transaction = {
  id: number;
  title: string;
  category: string;
  dateValue: string;
  amount: number;
  paidBy: PaidBy;
  expenseFor: ExpenseFor;
  icon: string;
};

type SettlementMethod = "UPI" | "Cash";

type Settlement = {
  id: number;
  amount: number;
  from: PaidBy;
  to: PaidBy;
  method: SettlementMethod;
  date: string;
};

const initialTransactions: Transaction[] = [
  {
    id: 1,
    title: "Groceries",
    category: "Household",
    dateValue: "2026-09-05T10:32:00",
    amount: 840,
    paidBy: "You",
    expenseFor: "Both",
    icon: "🛒",
  },
  {
    id: 2,
    title: "Electricity",
    category: "Bills",
    dateValue: "2026-09-04T18:00:00",
    amount: 1240,
    paidBy: "Partner",
    expenseFor: "Both",
    icon: "⚡",
  },
  {
    id: 3,
    title: "Chicken & vegetables",
    category: "Groceries",
    dateValue: "2026-08-31T12:00:00",
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

const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const formatTransactionDate = (dateValue: string) => {
  const date = new Date(dateValue);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (toLocalDateKey(date) === toLocalDateKey(today)) {
    return `Today, ${date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  if (toLocalDateKey(date) === toLocalDateKey(yesterday)) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
};

const isCurrentMonth = (dateValue: string) => {
  const date = new Date(dateValue);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
};

const getMonthKey = (dateValue: string) => {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const formatMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

const shiftMonth = (monthKey: string, amount: number) => {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};


function App() {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);

  const [screen, setScreen] = useState<Screen>("home");
  const [insightsMonth, setInsightsMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showSettlement, setShowSettlement] = useState(false);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [paidBy, setPaidBy] = useState<PaidBy>("You");
  const [expenseFor, setExpenseFor] = useState<ExpenseFor>("Both");



  const [activityFilter, setActivityFilter] = useState<
    "All" | "You" | "Partner"
  >("All");

  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementMethod, setSettlementMethod] =
    useState<SettlementMethod>("UPI");

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString("en-IN")}`;

  const openAddExpense = () => {
    setEditingTransaction(null);
    setAmount("");
    setDescription("");
    setCategory("Groceries");
    setPaidBy("You");
    setExpenseFor("Both");
    setShowAddExpense(true);
  };

  const openEditExpense = (transaction: Transaction) => {
    setSelectedTransaction(null);
    setEditingTransaction(transaction);
    setAmount(String(transaction.amount));
    setDescription(transaction.title);
    setCategory(transaction.category);
    setPaidBy(transaction.paidBy);
    setExpenseFor(transaction.expenseFor);
    setShowAddExpense(true);
  };

  const closeAddExpense = () => {
    setShowAddExpense(false);
    setEditingTransaction(null);
  };

  const saveExpense = () => {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0 || !description.trim()) {
      return;
    }

    if (editingTransaction) {
      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === editingTransaction.id
            ? {
                ...transaction,
                title: description.trim(),
                category,
                amount: numericAmount,
                paidBy,
                expenseFor,
                icon: categoryIcons[category] ?? "📦",
              }
            : transaction,
        ),
      );
    } else {
      const newTransaction: Transaction = {
        id: Date.now(),
        title: description.trim(),
        category,
        dateValue: new Date().toISOString(),
        amount: numericAmount,
        paidBy,
        expenseFor,
        icon: categoryIcons[category] ?? "📦",
      };

      setTransactions((current) => [newTransaction, ...current]);
    }

    setShowAddExpense(false);
    setEditingTransaction(null);
  };

  const deleteExpense = (transaction: Transaction) => {
    const confirmed = window.confirm(
      `Delete "${transaction.title}" for ${formatCurrency(transaction.amount)}?`,
    );

    if (!confirmed) {
      return;
    }

    setTransactions((current) =>
      current.filter((item) => item.id !== transaction.id),
    );
    setSelectedTransaction(null);
  };


  const balanceBeforeSettlements = transactions.reduce((total, transaction) => {
    let yourShare = 0;

    if (transaction.expenseFor === "Both") {
      yourShare = transaction.amount / 2;
    }

    if (transaction.expenseFor === "You") {
      yourShare = transaction.amount;
    }

    const amountYouPaid =
      transaction.paidBy === "You" ? transaction.amount : 0;

    return total + amountYouPaid - yourShare;
  }, 0);

  const openSettlement = () => {
    setSettlementAmount(
      balanceBeforeSettlements !== 0
        ? String(Math.abs(balanceBeforeSettlements))
        : "",
    );
    setSettlementMethod("UPI");
    setShowSettlement(true);
  };

  const closeSettlement = () => {
    setShowSettlement(false);
  };

  const recordSettlement = () => {
    const numericAmount = Number(settlementAmount);

    if (
      !numericAmount ||
      numericAmount <= 0 ||
      balanceBeforeSettlements === 0
    ) {
      return;
    }

    const from: PaidBy =
      balanceBeforeSettlements > 0 ? "Partner" : "You";
    const to: PaidBy = from === "You" ? "Partner" : "You";

    setSettlements((current) => [
      {
        id: Date.now(),
        amount: numericAmount,
        from,
        to,
        method: settlementMethod,
        date: "Just now",
      },
      ...current,
    ]);

    setShowSettlement(false);
    setSettlementAmount("");
  };

  const totalSpent = transactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );

  const yourShare = transactions.reduce((total, transaction) => {
    if (transaction.expenseFor === "You") return total + transaction.amount;
    if (transaction.expenseFor === "Both") return total + transaction.amount / 2;
    return total;
  }, 0);

  const yourPaid = transactions
    .filter((transaction) => transaction.paidBy === "You")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const partnerPaid = totalSpent - yourPaid;

  const currentMonthTransactions = transactions.filter((transaction) =>
    isCurrentMonth(transaction.dateValue),
  );

  const currentMonthSpent = currentMonthTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );

  const currentMonthYourShare = currentMonthTransactions.reduce((total, transaction) => {
    if (transaction.expenseFor === "You") return total + transaction.amount;
    if (transaction.expenseFor === "Both") return total + transaction.amount / 2;
    return total;
  }, 0);

  const currentMonthYourPaid = currentMonthTransactions
    .filter((transaction) => transaction.paidBy === "You")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const currentMonthPartnerPaid = currentMonthSpent - currentMonthYourPaid;

  const insightsTransactions = transactions.filter(
    (transaction) => getMonthKey(transaction.dateValue) === insightsMonth,
  );

  const insightsSpent = insightsTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );

  const insightsYourShare = insightsTransactions.reduce((total, transaction) => {
    if (transaction.expenseFor === "You") return total + transaction.amount;
    if (transaction.expenseFor === "Both") return total + transaction.amount / 2;
    return total;
  }, 0);

  const insightsYourPaid = insightsTransactions
    .filter((transaction) => transaction.paidBy === "You")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const insightsPartnerPaid = insightsSpent - insightsYourPaid;

  const currentMonthKey = getMonthKey(new Date().toISOString());

  const settlementEffect = settlements.reduce((total, settlement) => {
    return total + (settlement.from === "You" ? settlement.amount : -settlement.amount);
  }, 0);

  const balance = balanceBeforeSettlements + settlementEffect;

  const filteredTransactions =
    activityFilter === "All"
      ? transactions
      : transactions.filter(
          (transaction) => transaction.paidBy === activityFilter,
        );

  return (
    <div className="app-shell">
      <main className="app">
        {screen === "home" ? (
          <HomeScreen
            balance={balance}
            totalSpent={currentMonthSpent}
            transactions={transactions}
            formatCurrency={formatCurrency}
            onAddExpense={openAddExpense}
            onActivity={() => setScreen("activity")}
            onTransactionClick={setSelectedTransaction}
            onSettleUp={openSettlement}
            yourShare={currentMonthYourShare}
          />
        ) : screen === "activity" ? (
          <ActivityScreen
            transactions={transactions}
            formatCurrency={formatCurrency}
            filter={activityFilter}
            setFilter={setActivityFilter}
            onBack={() => setScreen("home")}
            onAddExpense={openAddExpense}
            onTransactionClick={setSelectedTransaction}
            currentMonthKey={currentMonthKey}
          />
        ) : (
          <InsightsScreen
            transactions={insightsTransactions}
            totalSpent={insightsSpent}
            yourPaid={insightsYourPaid}
            partnerPaid={insightsPartnerPaid}
            yourShare={insightsYourShare}
            balance={balance}
            formatCurrency={formatCurrency}
            monthKey={insightsMonth}
            currentMonthKey={currentMonthKey}
            onMonthChange={setInsightsMonth}
            onBack={() => setScreen("home")}
          />
        )}

        <nav className="bottom-nav">
          <button
            className={`nav-item ${screen === "home" ? "active" : ""}`}
            onClick={() => setScreen("home")}
          >
            <span>⌂</span>
            <small>Home</small>
          </button>

          <button
            className={`nav-item ${screen === "activity" ? "active" : ""}`}
            onClick={() => setScreen("activity")}
          >
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

          <button
            className={`nav-item ${screen === "insights" ? "active" : ""}`}
            onClick={() => setScreen("insights")}
          >
            <span>◔</span>
            <small>Insights</small>
          </button>

          <button className="nav-item">
            <span>⚙</span>
            <small>Settings</small>
          </button>
        </nav>
      </main>

      {selectedTransaction && (
        <ExpenseDetailsModal
          transaction={selectedTransaction}
          formatCurrency={formatCurrency}
          onClose={() => setSelectedTransaction(null)}
          onEdit={openEditExpense}
          onDelete={deleteExpense}
        />
      )}

      {showSettlement && (
        <SettlementModal
          balance={balance}
          amount={settlementAmount}
          setAmount={setSettlementAmount}
          method={settlementMethod}
          setMethod={setSettlementMethod}
          onClose={closeSettlement}
          onSave={recordSettlement}
          formatCurrency={formatCurrency}
        />
      )}

      {showAddExpense && (
        <AddExpenseModal
          amount={amount}
          setAmount={setAmount}
          description={description}
          setDescription={setDescription}
          category={category}
          setCategory={setCategory}
          paidBy={paidBy}
          setPaidBy={setPaidBy}
          expenseFor={expenseFor}
          setExpenseFor={setExpenseFor}
          onClose={closeAddExpense}
          onSave={saveExpense}
          formatCurrency={formatCurrency}
          isEditing={Boolean(editingTransaction)}
        />
      )}
    </div>
  );
}

function HomeScreen({
  balance,
  totalSpent,
  transactions,
  formatCurrency,
  onAddExpense,
  onActivity,
  onTransactionClick,
  onSettleUp,
  yourShare,
}: {
  balance: number;
  totalSpent: number;
  transactions: Transaction[];
  formatCurrency: (value: number) => string;
  onAddExpense: () => void;
  onActivity: () => void;
  onTransactionClick: (transaction: Transaction) => void;
  onSettleUp: () => void;
  yourShare: number;
}) {
  return (
    <>
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
            <h2>{formatCurrency(Math.abs(balance))}</h2>
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

        <button
          className="settle-button"
          onClick={onSettleUp}
          disabled={balance === 0}
        >
          {balance === 0 ? "All settled" : "Settle up"}
        </button>
      </section>

      <section className="summary-grid">
        <div className="summary-card">
          <span className="summary-icon">↗</span>
          <p>Total spent</p>
          <strong>{formatCurrency(totalSpent)}</strong>
          <small>Current month</small>
        </div>

        <div className="summary-card">
          <span className="summary-icon">◐</span>
          <p>Your share</p>
          <strong>{formatCurrency(yourShare)}</strong>
          <small>Recorded share</small>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">RECENT</p>
            <h3>Recent activity</h3>
          </div>

          <button className="view-all" onClick={onActivity}>
            View all
          </button>
        </div>

        <TransactionList
          transactions={transactions.slice(0, 3)}
          formatCurrency={formatCurrency}
          onTransactionClick={onTransactionClick}
        />
      </section>

      <button className="add-expense" onClick={onAddExpense}>
        <span>+</span>
        Add expense
      </button>
    </>
  );
}

function ActivityScreen({
  transactions,
  formatCurrency,
  filter,
  setFilter,
  onBack,
  onAddExpense,
  onTransactionClick,
  currentMonthKey,
}: {
  transactions: Transaction[];
  formatCurrency: (value: number) => string;
  filter: "All" | "You" | "Partner";
  setFilter: (filter: "All" | "You" | "Partner") => void;
  onBack: () => void;
  onAddExpense: () => void;
  onTransactionClick: (transaction: Transaction) => void;
  currentMonthKey: string;
}) {
  const [monthKey, setMonthKey] = useState(currentMonthKey);

  const monthTransactions = transactions.filter(
    (transaction) => getMonthKey(transaction.dateValue) === monthKey,
  );

  const filteredMonthTransactions =
    filter === "All"
      ? monthTransactions
      : monthTransactions.filter((transaction) => transaction.paidBy === filter);

  const monthTotal = monthTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );

  return (
    <>
      <header className="activity-header">
        <button className="back-button" onClick={onBack}>
          ←
        </button>

        <div>
          <p className="eyebrow">DUOSPEND</p>
          <h1>Activity</h1>
        </div>

        <button className="header-add" onClick={onAddExpense}>
          +
        </button>
      </header>

      <div className="month-selector" aria-label="Activity month selector">
        <span className="month-selector-kicker">MONTH</span>
        <button
          className="month-arrow"
          onClick={() => setMonthKey(shiftMonth(monthKey, -1))}
          aria-label="Previous month"
        >
          ←
        </button>
        <strong>{formatMonthLabel(monthKey)}</strong>
        <button
          className="month-arrow"
          onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
          aria-label="Next month"
          disabled={monthKey >= currentMonthKey}
        >
          →
        </button>
      </div>

      <section className="activity-summary">
        <p>{formatMonthLabel(monthKey).toUpperCase()}</p>
        <strong>{monthTransactions.length}</strong>
        <span>{monthTransactions.length === 1 ? "recorded expense" : "recorded expenses"} · {formatCurrency(monthTotal)}</span>
      </section>

      <div className="filter-row">
        {(["All", "You", "Partner"] as const).map((option) => (
          <button
            key={option}
            className={filter === option ? "filter active" : "filter"}
            onClick={() => setFilter(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <section className="activity-list-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">TRANSACTIONS</p>
            <h3>{formatMonthLabel(monthKey)}</h3>
          </div>
        </div>

        {filteredMonthTransactions.length > 0 ? (
          <TransactionList
            transactions={filteredMonthTransactions}
            formatCurrency={formatCurrency}
            onTransactionClick={onTransactionClick}
          />
        ) : (
          <div className="empty-state">
            <span>◌</span>
            <h3>No expenses here</h3>
            <p>Try another filter, change the month, or add a new expense.</p>
          </div>
        )}
      </section>
    </>
  );
}

function TransactionList({
  transactions,
  formatCurrency,
  onTransactionClick,
}: {
  transactions: Transaction[];
  formatCurrency: (value: number) => string;
  onTransactionClick: (transaction: Transaction) => void;
}) {
  return (
    <div className="transaction-list">
      {transactions.map((transaction) => (
        <button
          className="transaction transaction-button"
          key={transaction.id}
          onClick={() => onTransactionClick(transaction)}
          aria-label={`View ${transaction.title} expense`}
        >
          <div className="transaction-icon">{transaction.icon}</div>

          <div className="transaction-info">
            <h4>{transaction.title}</h4>
            <p>
              {transaction.category} · {formatTransactionDate(transaction.dateValue)}
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
        </button>
      ))}
    </div>
  );
}


function InsightsScreen({
  transactions,
  totalSpent,
  yourPaid,
  partnerPaid,
  yourShare,
  balance,
  formatCurrency,
  monthKey,
  currentMonthKey,
  onMonthChange,
  onBack,
}: {
  transactions: Transaction[];
  totalSpent: number;
  yourPaid: number;
  partnerPaid: number;
  yourShare: number;
  balance: number;
  formatCurrency: (value: number) => string;
  monthKey: string;
  currentMonthKey: string;
  onMonthChange: (monthKey: string) => void;
  onBack: () => void;
}) {
  const categoryTotals = transactions.reduce<Record<string, number>>((totals, transaction) => {
    totals[transaction.category] = (totals[transaction.category] ?? 0) + transaction.amount;
    return totals;
  }, {});

  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <header className="activity-header">
        <button className="back-button" onClick={onBack}>←</button>
        <div>
          <p className="eyebrow">DUOSPEND</p>
          <h1>Insights</h1>
        </div>
        <div className="header-spacer" />
      </header>

      <div className="month-selector" aria-label="Insights month selector">
        <span className="month-selector-kicker">MONTH</span>
        <button
          className="month-arrow"
          onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
          aria-label="Previous month"
        >
          ←
        </button>
        <strong>{formatMonthLabel(monthKey)}</strong>
        <button
          className="month-arrow"
          onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
          aria-label="Next month"
          disabled={monthKey >= currentMonthKey}
        >
          →
        </button>
      </div>

      <section className="insights-hero">
        <p className="section-kicker">SPENDING OVERVIEW</p>
        <h2>{formatCurrency(totalSpent)}</h2>
        <span>{transactions.length} recorded expenses</span>
      </section>

      <section className="insight-stat-grid">
        <div className="insight-stat-card">
          <span>You paid</span>
          <strong>{formatCurrency(yourPaid)}</strong>
        </div>
        <div className="insight-stat-card">
          <span>Partner paid</span>
          <strong>{formatCurrency(partnerPaid)}</strong>
        </div>
        <div className="insight-stat-card">
          <span>Your share</span>
          <strong>{formatCurrency(yourShare)}</strong>
        </div>
        <div className="insight-stat-card">
          <span>{balance >= 0 ? "You are owed" : "You owe"}</span>
          <strong>{formatCurrency(Math.abs(balance))}</strong>
        </div>
      </section>

      <section className="insights-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">BREAKDOWN</p>
            <h3>Spending by category</h3>
          </div>
        </div>

        {categories.length ? (
          <div className="category-breakdown">
            {categories.map(([name, value]) => (
              <div className="category-row" key={name}>
                <div className="category-row-top">
                  <span>{name}</span>
                  <strong>{formatCurrency(value)}</strong>
                </div>
                <div className="category-bar-track">
                  <div className="category-bar" style={{ width: `${totalSpent ? (value / totalSpent) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span>◌</span>
            <h3>No spending data yet</h3>
            <p>Add an expense to see your breakdown.</p>
          </div>
        )}
      </section>

      <section className="insights-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">CONTRIBUTIONS</p>
            <h3>Who paid more?</h3>
          </div>
        </div>
        <div className="contribution-card">
          <div className="contribution-labels">
            <span>You <strong>{formatCurrency(yourPaid)}</strong></span>
            <span>Partner <strong>{formatCurrency(partnerPaid)}</strong></span>
          </div>
          <div className="contribution-track">
            <div
              className="contribution-you"
              style={{ width: `${totalSpent ? (yourPaid / totalSpent) * 100 : 0}%` }}
            />
          </div>
        </div>
      </section>
    </>
  );
}

function ExpenseDetailsModal({
  transaction,
  formatCurrency,
  onClose,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  formatCurrency: (value: number) => string;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  const splitLabel =
    transaction.expenseFor === "Both"
      ? "Both · 50/50"
      : transaction.expenseFor === "You"
        ? "Just me"
        : "Partner";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="expense-details-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="section-kicker">EXPENSE DETAILS</p>
            <h2>{transaction.title}</h2>
          </div>

          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="details-amount">
          {formatCurrency(transaction.amount)}
        </div>

        <div className="details-grid">
          <div>
            <span>Category</span>
            <strong>{transaction.category}</strong>
          </div>

          <div>
            <span>Paid by</span>
            <strong>{transaction.paidBy}</strong>
          </div>

          <div>
            <span>For</span>
            <strong>{splitLabel}</strong>
          </div>

          <div>
            <span>Date</span>
            <strong>{formatTransactionDate(transaction.dateValue)}</strong>
          </div>
        </div>

        <div className="details-actions">
          <button
            className="edit-expense-button"
            onClick={() => onEdit(transaction)}
          >
            Edit expense
          </button>

          <button
            className="delete-expense-button"
            onClick={() => onDelete(transaction)}
          >
            Delete expense
          </button>
        </div>
      </section>
    </div>
  );
}

function SettlementModal({
  balance,
  amount,
  setAmount,
  method,
  setMethod,
  onClose,
  onSave,
  formatCurrency,
}: {
  balance: number;
  amount: string;
  setAmount: (value: string) => void;
  method: SettlementMethod;
  setMethod: (value: SettlementMethod) => void;
  onClose: () => void;
  onSave: () => void;
  formatCurrency: (value: number) => string;
}) {
  const youReceive = balance > 0;
  const directionText = youReceive
    ? "Partner pays you"
    : "You pay partner";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="expense-modal settlement-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="section-kicker">SETTLE UP</p>
            <h2>{directionText}</h2>
          </div>

          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settlement-summary">
          <span>{youReceive ? "Partner owes you" : "You owe partner"}</span>
          <strong>{formatCurrency(Math.abs(balance))}</strong>
        </div>

        <label className="field">
          <span>Amount to settle</span>

          <div className="amount-input-wrapper compact">
            <span>₹</span>
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
        </label>

        <div className="field">
          <span>Payment method</span>

          <div className="segmented-control">
            <button
              className={method === "UPI" ? "selected" : ""}
              onClick={() => setMethod("UPI")}
            >
              UPI
            </button>

            <button
              className={method === "Cash" ? "selected" : ""}
              onClick={() => setMethod("Cash")}
            >
              Cash
            </button>
          </div>
        </div>

        <div className="settlement-note">
          <span>After this payment</span>
          <strong>
            {formatCurrency(
              Math.abs(
                balance +
                  (youReceive
                    ? -Number(amount || 0)
                    : Number(amount || 0)),
              ),
            )}
            {Number(amount || 0) >= Math.abs(balance) ? " · Settled" : " remaining"}
          </strong>
        </div>

        <button
          className="save-expense"
          onClick={onSave}
          disabled={
            !amount ||
            Number(amount) <= 0 ||
            balance === 0 ||
            Number(amount) > Math.abs(balance)
          }
        >
          Record payment
        </button>
      </section>
    </div>
  );
}

function AddExpenseModal({
  amount,
  setAmount,
  description,
  setDescription,
  category,
  setCategory,
  paidBy,
  setPaidBy,
  expenseFor,
  setExpenseFor,
  onClose,
  onSave,
  formatCurrency,
  isEditing,
}: {
  amount: string;
  setAmount: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  paidBy: PaidBy;
  setPaidBy: (value: PaidBy) => void;
  expenseFor: ExpenseFor;
  setExpenseFor: (value: ExpenseFor) => void;
  onClose: () => void;
  onSave: () => void;
  formatCurrency: (value: number) => string;
  isEditing: boolean;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="expense-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="section-kicker">
              {isEditing ? "EDIT TRANSACTION" : "NEW TRANSACTION"}
            </p>
            <h2>{isEditing ? "Edit expense" : "Add expense"}</h2>
          </div>

          <button className="close-button" onClick={onClose}>
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
          onClick={onSave}
          disabled={!amount || !description.trim()}
        >
          {isEditing ? "Save changes" : "Save expense"}
        </button>
      </section>
    </div>
  );
}

export default App;