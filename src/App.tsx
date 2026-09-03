import "./App.css";

type Transaction = {
  title: string;
  category: string;
  date: string;
  amount: string;
  paidBy: "You" | "Partner";
  icon: string;
};

const transactions: Transaction[] = [
  {
    title: "Groceries",
    category: "Household",
    date: "Today, 10:32 AM",
    amount: "₹840",
    paidBy: "You",
    icon: "🛒",
  },
  {
    title: "Electricity",
    category: "Bills",
    date: "Yesterday",
    amount: "₹1,240",
    paidBy: "Partner",
    icon: "⚡",
  },
  {
    title: "Chicken & vegetables",
    category: "Groceries",
    date: "Aug 31",
    amount: "₹560",
    paidBy: "You",
    icon: "🥬",
  },
];

function App() {
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
              <h2>₹2,840</h2>
            </div>

            <span className="balance-status">● You are owed</span>
          </div>

          <p className="balance-description">
            Your partner owes you this amount.
          </p>

          <button className="settle-button">Settle up</button>
        </section>

        <section className="summary-grid">
          <div className="summary-card">
            <span className="summary-icon">↗</span>
            <p>Total spent</p>
            <strong>₹8,420</strong>
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
              <article className="transaction" key={transaction.title}>
                <div className="transaction-icon">{transaction.icon}</div>

                <div className="transaction-info">
                  <h4>{transaction.title}</h4>
                  <p>
                    {transaction.category} · {transaction.date}
                  </p>
                </div>

                <div className="transaction-amount">
                  <strong>{transaction.amount}</strong>
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

        <button className="add-expense">
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

          <button className="nav-add" aria-label="Add expense">
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
    </div>
  );
}

export default App;