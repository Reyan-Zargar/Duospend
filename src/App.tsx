import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import "./App.css";

type PaidBy = "You" | "Partner";
type ExpenseFor = "Both" | "You" | "Partner";
type Screen = "home" | "activity" | "insights";

type Transaction = {
  id: string;
  title: string;
  category: string;
  dateValue: string;
  amount: number;
  yourShare: number;
  paidBy: PaidBy;
  expenseFor: ExpenseFor;
  icon: string;
};

type SettlementMethod = "UPI" | "Cash";

type Settlement = {
  id: string;
  amount: number;
  amountPaise: number;
  from: PaidBy;
  to: PaidBy;
  method: SettlementMethod;
  date: string;
};

const DEFAULT_CATEGORIES = [
  { name: "Groceries", icon: "🛒" },
  { name: "Food", icon: "🍽️" },
  { name: "Housing", icon: "🏠" },
  { name: "Bills", icon: "⚡" },
  { name: "Household", icon: "🧼" },
  { name: "Transport", icon: "🚕" },
  { name: "Entertainment", icon: "🎮" },
  { name: "Personal", icon: "👤" },
  { name: "Other", icon: "📦" },
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

const parseRupeesToPaise = (value: string) => {
  const normalized = value.trim();

  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }

  const [rupeesPart, paisePart = ""] = normalized.split(".");
  const rupees = Number(rupeesPart);

  if (!Number.isSafeInteger(rupees) || rupees < 0) {
    return null;
  }

  const paise = Number(paisePart.padEnd(2, "0") || "0");
  const totalPaise = rupees * 100 + paise;

  if (!Number.isSafeInteger(totalPaise) || totalPaise <= 0 || totalPaise > 2_147_483_647) {
    return null;
  }

  return totalPaise;
};

const formatPaiseAsRupees = (paise: number) => paise / 100;

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
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState("Reyan");
  const [householdLoading, setHouseholdLoading] = useState(true);
  const [householdError, setHouseholdError] = useState("");
  const [householdRetry, setHouseholdRetry] = useState(0);
  const [householdSetupRequired, setHouseholdSetupRequired] = useState(false);
  const [householdName, setHouseholdName] = useState("DuoSpend Home");
  const [inviteCode, setInviteCode] = useState("");
  const [householdActionLoading, setHouseholdActionLoading] = useState(false);
  const [householdActionError, setHouseholdActionError] = useState("");
  const [showHouseholdPanel, setShowHouseholdPanel] = useState(false);
  const [householdMemberCount, setHouseholdMemberCount] = useState(1);
  const [partnerUserId, setPartnerUserId] = useState<string | null>(null);
  const [categoryRows, setCategoryRows] = useState<
    Array<{ id: string; name: string; icon: string }>
  >([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [dataRetry, setDataRetry] = useState(0);
  const [expenseActionLoading, setExpenseActionLoading] = useState(false);
  const [expenseError, setExpenseError] = useState("");

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

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
  const [settlementActionLoading, setSettlementActionLoading] = useState(false);
  const [settlementError, setSettlementError] = useState("");

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

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setAuthError(error.message);
      } else {
        setSession(data.session);
      }

      setAuthLoading(false);
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setAuthLoading(false);
      },
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrapHousehold = async () => {
      if (!session) {
        if (mounted) {
          setHouseholdId(null);
          setHouseholdSetupRequired(false);
          setHouseholdLoading(false);
          setHouseholdError("");
          setHouseholdName("DuoSpend Home");
          setInviteCode("");
          setHouseholdMemberCount(0);
          setPartnerUserId(null);
          setCategoryRows([]);
          setTransactions([]);
          setSettlements([]);
          setDataLoading(false);
          setDataError("");
        }
        return;
      }

      setHouseholdLoading(true);
      setHouseholdError("");
      setHouseholdActionError("");

      try {
        const userId = session.user.id;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) throw profileError;

        if (mounted && profile?.display_name) {
          setProfileDisplayName(profile.display_name);
        }

        const { data: membership, error: membershipError } = await supabase
          .from("household_members")
          .select("household_id")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();

        if (membershipError) throw membershipError;

        const activeHouseholdId = membership?.household_id ?? null;

        if (!activeHouseholdId) {
          if (!mounted) return;

          setHouseholdId(null);
          setPartnerUserId(null);
          setCategoryRows([]);
          setTransactions([]);
          setHouseholdName("DuoSpend Home");
          setInviteCode("");
          setHouseholdMemberCount(0);
          setHouseholdSetupRequired(true);
          setHouseholdError("");
          setDataLoading(false);
          setDataError("");
          setHouseholdLoading(false);
          return;
        }

        const { data: household, error: householdLookupError } = await supabase
          .from("households")
          .select("id, name, invite_code")
          .eq("id", activeHouseholdId)
          .single();

        if (householdLookupError) throw householdLookupError;

        const { data: members, error: membersError } = await supabase
          .from("household_members")
          .select("user_id")
          .eq("household_id", activeHouseholdId);

        if (membersError) throw membersError;

        const { data: existingCategories, error: categoriesError } = await supabase
          .from("categories")
          .select("name")
          .eq("household_id", activeHouseholdId);

        if (categoriesError) throw categoriesError;

        const existingCategoryNames = new Set(
          (existingCategories ?? []).map((item) => item.name),
        );

        const missingCategories = DEFAULT_CATEGORIES.filter(
          (item) => !existingCategoryNames.has(item.name),
        ).map((item) => ({
          household_id: activeHouseholdId,
          name: item.name,
          icon: item.icon,
        }));

        if (missingCategories.length > 0) {
          const { error: categoryInsertError } = await supabase
            .from("categories")
            .insert(missingCategories);

          if (categoryInsertError) throw categoryInsertError;
        }

        if (!mounted) return;

        setHouseholdId(activeHouseholdId);
        setHouseholdName(household.name || "DuoSpend Home");
        setInviteCode(household.invite_code || "");
        setHouseholdMemberCount(members?.length ?? 0);
        setHouseholdSetupRequired(false);
        setHouseholdLoading(false);
      } catch (error) {
        if (!mounted) return;

        setHouseholdLoading(false);
        setHouseholdError(
          error instanceof Error
            ? error.message
            : "Unable to load your DuoSpend household.",
        );
      }
    };

    bootstrapHousehold();

    return () => {
      mounted = false;
    };
  }, [session, householdRetry]);

  const createHousehold = async () => {
    if (!session) return;

    setHouseholdActionLoading(true);
    setHouseholdActionError("");

    try {
      const userId = session.user.id;
      const generatedInviteCode = crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 8)
        .toUpperCase();

      const { data: newHousehold, error: householdInsertError } = await supabase
        .from("households")
        .insert({
          name: householdName.trim() || "DuoSpend Home",
          created_by: userId,
          invite_code: generatedInviteCode,
        })
        .select("id")
        .single();

      if (householdInsertError) throw householdInsertError;
      if (!newHousehold?.id) throw new Error("The household was created without an ID.");

      const { error: memberInsertError } = await supabase
        .from("household_members")
        .insert({
          household_id: newHousehold.id,
          user_id: userId,
        });

      if (memberInsertError) throw memberInsertError;

      setHouseholdRetry((value) => value + 1);
    } catch (error) {
      setHouseholdActionError(
        error instanceof Error
          ? error.message
          : "Unable to create your household.",
      );
    } finally {
      setHouseholdActionLoading(false);
    }
  };

  const joinHousehold = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setHouseholdActionError("Enter the invite code shared by your partner.");
      return;
    }

    setHouseholdActionLoading(true);
    setHouseholdActionError("");

    try {
      const { error } = await supabase.rpc("join_household_by_invite", {
        p_invite_code: cleanCode,
      });

      if (error) throw error;

      setHouseholdRetry((value) => value + 1);
    } catch (error) {
      setHouseholdActionError(
        error instanceof Error ? error.message : "Unable to join this household.",
      );
    } finally {
      setHouseholdActionLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadHouseholdData = async () => {
      if (!session || !householdId) {
        if (mounted) {
          setPartnerUserId(null);
          setCategoryRows([]);
          setTransactions([]);
          setDataLoading(false);
          setDataError("");
        }
        return;
      }

      setDataLoading(true);
      setDataError("");

      try {
        const userId = session.user.id;

        const { data: members, error: membersError } = await supabase
          .from("household_members")
          .select("user_id")
          .eq("household_id", householdId);

        if (membersError) throw membersError;

        const nextPartnerUserId =
          (members ?? []).map((member) => member.user_id).find((id) => id !== userId) ?? null;

        const { data: categories, error: categoriesError } = await supabase
          .from("categories")
          .select("id, name, icon")
          .eq("household_id", householdId)
          .order("name");

        if (categoriesError) throw categoriesError;

        const { data: expenses, error: expensesError } = await supabase
          .from("expenses")
          .select(
            "id, paid_by, amount, description, category_id, expense_date",
          )
          .eq("household_id", householdId)
          .order("expense_date", { ascending: false });

        if (expensesError) throw expensesError;

        const expenseIds = (expenses ?? []).map((expense) => expense.id);
        let splits: Array<{ expense_id: string; user_id: string; amount: number }> = [];

        if (expenseIds.length > 0) {
          const { data: splitRows, error: splitsError } = await supabase
            .from("expense_splits")
            .select("expense_id, user_id, amount")
            .in("expense_id", expenseIds);

          if (splitsError) throw splitsError;
          splits = splitRows ?? [];
        }

        const { data: settlementRows, error: settlementsError } = await supabase
          .from("settlements")
          .select("id, from_user, to_user, amount, method, settlement_date")
          .eq("household_id", householdId)
          .order("settlement_date", { ascending: false });

        if (settlementsError) throw settlementsError;

        const mappedSettlements: Settlement[] = (settlementRows ?? []).map(
          (settlement) => ({
            id: settlement.id,
            amount: formatPaiseAsRupees(settlement.amount),
            amountPaise: settlement.amount,
            from: settlement.from_user === userId ? "You" : "Partner",
            to: settlement.to_user === userId ? "You" : "Partner",
            method: settlement.method === "Cash" ? "Cash" : "UPI",
            date: settlement.settlement_date,
          }),
        );

        const splitsByExpense = new Map<
          string,
          Array<{ user_id: string; amount: number }>
        >();

        for (const split of splits) {
          const current = splitsByExpense.get(split.expense_id) ?? [];
          current.push({ user_id: split.user_id, amount: split.amount });
          splitsByExpense.set(split.expense_id, current);
        }

        const categoryMap = new Map<
          string,
          { id: string; name: string; icon: string }
        >((categories ?? []).map((categoryRow) => [
          categoryRow.id,
          categoryRow,
        ]));

        const mappedTransactions: Transaction[] = (expenses ?? []).map((expense) => {
          const splitRows = splitsByExpense.get(expense.id) ?? [];
          const hasYouSplit = splitRows.some((split) => split.user_id === userId);
          const hasPartnerSplit = nextPartnerUserId
            ? splitRows.some((split) => split.user_id === nextPartnerUserId)
            : false;

          let expenseFor: ExpenseFor = "You";

          if (hasYouSplit && hasPartnerSplit) {
            expenseFor = "Both";
          } else if (hasPartnerSplit) {
            expenseFor = "Partner";
          }

          const categoryInfo = categoryMap.get(expense.category_id);
          const yourSharePaise =
            splitRows.find((split) => split.user_id === userId)?.amount ?? 0;

          return {
            id: expense.id,
            title: expense.description,
            category: categoryInfo?.name ?? "Other",
            dateValue: expense.expense_date,
            amount: formatPaiseAsRupees(expense.amount),
            yourShare: formatPaiseAsRupees(yourSharePaise),
            paidBy: expense.paid_by === userId ? "You" : "Partner",
            expenseFor,
            icon: categoryInfo?.icon ?? categoryIcons[categoryInfo?.name ?? "Other"] ?? "📦",
          };
        });

        if (!mounted) return;

        setPartnerUserId(nextPartnerUserId);
        setCategoryRows(categories ?? []);
        setTransactions(mappedTransactions);
        setSettlements(mappedSettlements);
        setDataLoading(false);
      } catch (error) {
        if (!mounted) return;

        setDataLoading(false);
        setDataError(
          error instanceof Error
            ? error.message
            : "Unable to load your DuoSpend expenses.",
        );
      }
    };

    loadHouseholdData();

    return () => {
      mounted = false;
    };
  }, [session, householdId, dataRetry]);

  const handleAuth = async () => {
    const email = authEmail.trim();

    setAuthError("");
    setAuthMessage("");

    if (!email || !authPassword) {
      setAuthError("Enter your email and password.");
      return;
    }

    if (authPassword.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }

    setAuthLoading(true);

    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: authPassword,
        options: {
          data: {
            display_name: authDisplayName.trim() || "User",
          },
        },
      });

      setAuthLoading(false);

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (data.session) {
        setSession(data.session);
        return;
      }

      setAuthMessage(
        "Account created. Check your email and confirm your address before signing in.",
      );
      setAuthMode("login");
      setAuthPassword("");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: authPassword,
    });

    setAuthLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setSession(data.session);
    setAuthPassword("");
  };

  if (authLoading) {
    return (
      <div className="app-shell">
        <main className="app">
          <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
            <p className="section-kicker">DUOSPEND · LOADING</p>
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <AuthScreen
        mode={authMode}
        email={authEmail}
        password={authPassword}
        displayName={authDisplayName}
        error={authError}
        message={authMessage}
        loading={authLoading}
        setMode={setAuthMode}
        setEmail={setAuthEmail}
        setPassword={setAuthPassword}
        setDisplayName={setAuthDisplayName}
        onSubmit={handleAuth}
      />
    );
  }

  if (householdLoading) {
    return (
      <div className="app-shell">
        <main className="app">
          <div
            style={{
              minHeight: "100vh",
              display: "grid",
              placeItems: "center",
              padding: 24,
              textAlign: "center",
            }}
          >
            <div>
              <p className="section-kicker">DUOSPEND · SETTING UP</p>
              <h2 style={{ marginTop: 8 }}>Preparing your shared home…</h2>
              <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
                Connecting your account to your DuoSpend household.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (householdSetupRequired) {
    return (
      <HouseholdSetupScreen
        displayName={profileDisplayName}
        householdName={householdName}
        setHouseholdName={setHouseholdName}
        inviteCode={inviteCode}
        setInviteCode={setInviteCode}
        loading={householdActionLoading}
        error={householdActionError}
        onCreate={createHousehold}
        onJoin={joinHousehold}
      />
    );
  }

  if (householdError || !householdId) {
    return (
      <div className="app-shell">
        <main className="app">
          <div
            style={{
              minHeight: "100vh",
              display: "grid",
              placeItems: "center",
              padding: 24,
              textAlign: "center",
            }}
          >
            <div style={{ width: "100%", maxWidth: 430 }}>
              <p className="section-kicker">DUOSPEND · CONNECTION</p>
              <h2 style={{ marginTop: 8 }}>We couldn’t load your home</h2>
              <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
                {householdError || "Your household is not available yet."}
              </p>
              <button
                className="save-expense"
                type="button"
                onClick={() => setHouseholdRetry((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="app-shell">
        <main className="app">
          <div
            style={{
              minHeight: "100vh",
              display: "grid",
              placeItems: "center",
              padding: 24,
              textAlign: "center",
            }}
          >
            <div>
              <p className="section-kicker">DUOSPEND · LOADING</p>
              <h2 style={{ marginTop: 8 }}>Loading your expenses…</h2>
              <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
                Getting the latest activity from your shared home.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="app-shell">
        <main className="app">
          <div
            style={{
              minHeight: "100vh",
              display: "grid",
              placeItems: "center",
              padding: 24,
              textAlign: "center",
            }}
          >
            <div style={{ width: "100%", maxWidth: 430 }}>
              <p className="section-kicker">DUOSPEND · SYNC</p>
              <h2 style={{ marginTop: 8 }}>We couldn’t load your expenses</h2>
              <p style={{ opacity: 0.7, lineHeight: 1.5 }}>{dataError}</p>
              <button
                className="save-expense"
                type="button"
                onClick={() => setDataRetry((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString("en-IN")}`;

  const openAddExpense = () => {
    setEditingTransaction(null);
    setExpenseError("");
    setAmount("");
    setDescription("");
    setCategory("Groceries");
    setPaidBy("You");
    setExpenseFor("Both");
    setShowAddExpense(true);
  };

  const openEditExpense = (transaction: Transaction) => {
    setSelectedTransaction(null);
    setExpenseError("");
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
    setExpenseError("");
    setEditingTransaction(null);
  };

  const saveExpense = async () => {
    setExpenseError("");

    if (!session || !householdId) {
      setExpenseError("Your shared home is not ready yet. Please try again.");
      return;
    }

    const amountPaise = parseRupeesToPaise(amount);
    const cleanDescription = description.trim();
    const selectedCategory = categoryRows.find((row) => row.name === category);

    if (!amountPaise || !cleanDescription) {
      setExpenseError("Enter a valid amount and description.");
      return;
    }

    if (!selectedCategory) {
      setExpenseError("Please choose a valid category.");
      return;
    }

    const userId = session.user.id;
    const paidByUserId = paidBy === "You" ? userId : partnerUserId;

    if (!paidByUserId) {
      setExpenseError("Your partner has not joined this household yet.");
      return;
    }

    if (expenseFor === "Both" && !partnerUserId) {
      setExpenseError("Your partner needs to join before a shared split can be recorded.");
      return;
    }

    const splitRows =
      expenseFor === "Both" && partnerUserId
        ? [
            {
              user_id: userId,
              amount: Math.floor(amountPaise / 2),
            },
            {
              user_id: partnerUserId,
              amount: amountPaise - Math.floor(amountPaise / 2),
            },
          ]
        : [
            {
              user_id: expenseFor === "Partner" ? partnerUserId! : userId,
              amount: amountPaise,
            },
          ];

    setExpenseActionLoading(true);

    try {
      if (editingTransaction) {
        const { error: updateError } = await supabase
          .from("expenses")
          .update({
            paid_by: paidByUserId,
            amount: amountPaise,
            description: cleanDescription,
            category_id: selectedCategory.id,
          })
          .eq("id", editingTransaction.id)
          .eq("household_id", householdId);

        if (updateError) throw updateError;

        const { error: deleteSplitsError } = await supabase
          .from("expense_splits")
          .delete()
          .eq("expense_id", editingTransaction.id);

        if (deleteSplitsError) throw deleteSplitsError;

        const { error: insertSplitsError } = await supabase
          .from("expense_splits")
          .insert(
            splitRows.map((split) => ({
              expense_id: editingTransaction.id,
              user_id: split.user_id,
              amount: split.amount,
            })),
          );

        if (insertSplitsError) throw insertSplitsError;
      } else {
        const { data: createdExpense, error: createError } = await supabase
          .from("expenses")
          .insert({
            household_id: householdId,
            created_by: userId,
            paid_by: paidByUserId,
            amount: amountPaise,
            description: cleanDescription,
            category_id: selectedCategory.id,
            expense_date: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (createError) throw createError;
        if (!createdExpense?.id) {
          throw new Error("The expense was created without an ID.");
        }

        const { error: insertSplitsError } = await supabase
          .from("expense_splits")
          .insert(
            splitRows.map((split) => ({
              expense_id: createdExpense.id,
              user_id: split.user_id,
              amount: split.amount,
            })),
          );

        if (insertSplitsError) {
          await supabase
            .from("expenses")
            .delete()
            .eq("id", createdExpense.id)
            .eq("household_id", householdId);
          throw insertSplitsError;
        }
      }

      setShowAddExpense(false);
      setEditingTransaction(null);
      setAmount("");
      setDescription("");
      setDataRetry((value) => value + 1);
    } catch (error) {
      setExpenseError(
        error instanceof Error
          ? error.message
          : "Unable to save this expense.",
      );
    } finally {
      setExpenseActionLoading(false);
    }
  };

  const deleteExpense = async (transaction: Transaction) => {
    const confirmed = window.confirm(
      `Delete "${transaction.title}" for ${formatCurrency(transaction.amount)}?`,
    );

    if (!confirmed || !householdId) {
      return;
    }

    setExpenseError("");
    setExpenseActionLoading(true);

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", transaction.id)
        .eq("household_id", householdId);

      if (error) throw error;

      setSelectedTransaction(null);
      setDataRetry((value) => value + 1);
    } catch (error) {
      setExpenseError(
        error instanceof Error
          ? error.message
          : "Unable to delete this expense.",
      );
    } finally {
      setExpenseActionLoading(false);
    }
  };



  const balanceBeforeSettlementsPaise = transactions.reduce(
    (total, transaction) => {
      const amountYouPaidPaise =
        transaction.paidBy === "You" ? Math.round(transaction.amount * 100) : 0;

      return total + amountYouPaidPaise - Math.round(transaction.yourShare * 100);
    },
    0,
  );

  const balanceBeforeSettlements = balanceBeforeSettlementsPaise / 100;

  const openSettlement = () => {
    setSettlementError("");
    setSettlementAmount(
      balanceBeforeSettlements !== 0
        ? String(Math.abs(balanceBeforeSettlements))
        : "",
    );
    setSettlementMethod("UPI");
    setShowSettlement(true);
  };

  const closeSettlement = () => {
    if (settlementActionLoading) return;
    setShowSettlement(false);
    setSettlementError("");
  };

  const recordSettlement = async () => {
    setSettlementError("");

    if (!session || !householdId || !partnerUserId) {
      setSettlementError("Both household members need to be connected before settling up.");
      return;
    }

    const amountPaise = parseRupeesToPaise(settlementAmount);

    if (!amountPaise || balanceBeforeSettlementsPaise === 0) {
      setSettlementError("Enter a valid settlement amount.");
      return;
    }

    if (amountPaise > Math.abs(balanceBeforeSettlementsPaise)) {
      setSettlementError("The settlement cannot be greater than the outstanding balance.");
      return;
    }

    const userId = session.user.id;
    const fromUserId = balanceBeforeSettlementsPaise > 0 ? partnerUserId : userId;
    const toUserId = fromUserId === userId ? partnerUserId : userId;

    setSettlementActionLoading(true);

    try {
      const { error } = await supabase
        .from("settlements")
        .insert({
          household_id: householdId,
          from_user: fromUserId,
          to_user: toUserId,
          amount: amountPaise,
          method: settlementMethod,
          settlement_date: new Date().toISOString(),
          created_by: userId,
        });

      if (error) throw error;

      setShowSettlement(false);
      setSettlementAmount("");
      setSettlementError("");
      setDataRetry((value) => value + 1);
    } catch (error) {
      setSettlementError(
        error instanceof Error
          ? error.message
          : "Unable to record this payment.",
      );
    } finally {
      setSettlementActionLoading(false);
    }
  };

  const currentMonthTransactions = transactions.filter((transaction) =>
    isCurrentMonth(transaction.dateValue),
  );

  const currentMonthSpent = currentMonthTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );

  const currentMonthYourShare = currentMonthTransactions.reduce(
    (total, transaction) => total + transaction.yourShare,
    0,
  );

  const insightsTransactions = transactions.filter(
    (transaction) => getMonthKey(transaction.dateValue) === insightsMonth,
  );

  const insightsSpent = insightsTransactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );

  const insightsYourShare = insightsTransactions.reduce(
    (total, transaction) => total + transaction.yourShare,
    0,
  );

  const insightsYourPaid = insightsTransactions
    .filter((transaction) => transaction.paidBy === "You")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const insightsPartnerPaid = insightsSpent - insightsYourPaid;

  const currentMonthKey = getMonthKey(new Date().toISOString());

  const settlementEffectPaise = settlements.reduce((total, settlement) => {
    return total + (settlement.from === "Partner" ? -settlement.amountPaise : settlement.amountPaise);
  }, 0);

  const balancePaise = balanceBeforeSettlementsPaise + settlementEffectPaise;
  const balance = balancePaise / 100;

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
            displayName={profileDisplayName}
            onHousehold={() => setShowHouseholdPanel(true)}
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
          saving={settlementActionLoading}
          error={settlementError}
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
          saving={expenseActionLoading}
          error={expenseError}
        />
      )}

      {showHouseholdPanel && (
        <HouseholdPanelModal
          householdName={householdName}
          inviteCode={inviteCode}
          memberCount={householdMemberCount}
          onClose={() => setShowHouseholdPanel(false)}
        />
      )}
    </div>
  );
}

function AuthScreen({
  mode,
  email,
  password,
  displayName,
  error,
  message,
  loading,
  setMode,
  setEmail,
  setPassword,
  setDisplayName,
  onSubmit,
}: {
  mode: "login" | "signup";
  email: string;
  password: string;
  displayName: string;
  error: string;
  message: string;
  loading: boolean;
  setMode: (mode: "login" | "signup") => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setDisplayName: (value: string) => void;
  onSubmit: () => void;
}) {
  const isSignup = mode === "signup";

  return (
    <div className="app-shell">
      <main className="app">
        <section
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "32px 20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 430,
              padding: 28,
              borderRadius: 24,
              background: "var(--surface, #1a1d1a)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxSizing: "border-box",
            }}
          >
            <p className="eyebrow">DUOSPEND</p>
            <h1 style={{ marginTop: 8 }}>{isSignup ? "Create your account" : "Welcome back"}</h1>
            <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
              {isSignup
                ? "Create your private DuoSpend account to continue."
                : "Sign in to continue to your shared expenses."}
            </p>

            <div className="segmented-control" style={{ margin: "24px 0" }}>
              <button
                type="button"
                className={!isSignup ? "selected" : ""}
                onClick={() => {
                  setMode("login");
                }}
              >
                Log in
              </button>
              <button
                type="button"
                className={isSignup ? "selected" : ""}
                onClick={() => {
                  setMode("signup");
                }}
              >
                Sign up
              </button>
            </div>

            {isSignup && (
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name"
                />
              </label>
            )}

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onSubmit();
                }}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </label>

            {error && (
              <p style={{ margin: "14px 0", color: "#f08b8b", lineHeight: 1.4 }}>
                {error}
              </p>
            )}

            {message && (
              <p style={{ margin: "14px 0", color: "#a9c8a9", lineHeight: 1.4 }}>
                {message}
              </p>
            )}

            <button
              type="button"
              className="save-expense"
              onClick={onSubmit}
              disabled={loading}
            >
              {loading ? "Please wait…" : isSignup ? "Create account" : "Log in"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function HouseholdSetupScreen({
  displayName,
  householdName,
  setHouseholdName,
  inviteCode,
  setInviteCode,
  loading,
  error,
  onCreate,
  onJoin,
}: {
  displayName: string;
  householdName: string;
  setHouseholdName: (value: string) => void;
  inviteCode: string;
  setInviteCode: (value: string) => void;
  loading: boolean;
  error: string;
  onCreate: () => void;
  onJoin: (code: string) => void;
}) {
  const [mode, setMode] = useState<"join" | "create">("join");

  return (
    <div className="app-shell">
      <main className="app">
        <section
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "32px 20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 430,
              padding: 28,
              borderRadius: 24,
              background: "var(--surface, #1a1d1a)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxSizing: "border-box",
            }}
          >
            <p className="eyebrow">DUOSPEND · SHARED HOME</p>
            <h1 style={{ marginTop: 8 }}>Welcome, {displayName}</h1>
            <p style={{ opacity: 0.7, lineHeight: 1.5 }}>
              Join your partner’s DuoSpend home, or create a new one.
            </p>

            <div className="segmented-control" style={{ margin: "24px 0" }}>
              <button
                type="button"
                className={mode === "join" ? "selected" : ""}
                onClick={() => setMode("join")}
              >
                Join a home
              </button>
              <button
                type="button"
                className={mode === "create" ? "selected" : ""}
                onClick={() => setMode("create")}
              >
                Create one
              </button>
            </div>

            {mode === "join" ? (
              <label className="field">
                <span>Invite code</span>
                <input
                  type="text"
                  placeholder="e.g. A1B2C3D4"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={8}
                />
              </label>
            ) : (
              <label className="field">
                <span>Home name</span>
                <input
                  type="text"
                  placeholder="DuoSpend Home"
                  value={householdName}
                  onChange={(event) => setHouseholdName(event.target.value)}
                  maxLength={60}
                />
              </label>
            )}

            {error && (
              <p style={{ margin: "14px 0", color: "#f08b8b", lineHeight: 1.4 }}>
                {error}
              </p>
            )}

            <button
              type="button"
              className="save-expense"
              disabled={loading || (mode === "join" && !inviteCode.trim())}
              onClick={() => (mode === "join" ? onJoin(inviteCode) : onCreate())}
            >
              {loading ? "Please wait…" : mode === "join" ? "Join home" : "Create home"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function HouseholdPanelModal({
  householdName,
  inviteCode,
  memberCount,
  onClose,
}: {
  householdName: string;
  inviteCode: string;
  memberCount: number;
  onClose: () => void;
}) {
  const [copyMessage, setCopyMessage] = useState("");

  const copyInviteCode = async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopyMessage("Copied");
    } catch {
      setCopyMessage("Copy failed");
    }

    window.setTimeout(() => setCopyMessage(""), 1800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="expense-details-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="section-kicker">SHARED HOME</p>
            <h2>{householdName}</h2>
          </div>

          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="details-grid">
          <div>
            <span>Members</span>
            <strong>{memberCount} / 2</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{memberCount >= 2 ? "Both connected" : "Waiting for partner"}</strong>
          </div>
        </div>

        {inviteCode && memberCount < 2 && (
          <div className="settlement-summary" style={{ marginTop: 18 }}>
            <span>Partner invite code</span>
            <strong style={{ letterSpacing: "0.14em" }}>{inviteCode}</strong>
          </div>
        )}

        {memberCount < 2 && (
          <div className="details-actions" style={{ marginTop: 18 }}>
            <button className="edit-expense-button" onClick={copyInviteCode}>
              {copyMessage || "Copy invite code"}
            </button>
          </div>
        )}
      </section>
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
  displayName,
  onHousehold,
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
  displayName: string;
  onHousehold: () => void;
}) {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">DUOSPEND</p>
          <h1>Good morning, {displayName}</h1>
        </div>

        <button className="avatar" aria-label="Household" onClick={onHousehold}>
          {displayName.trim().charAt(0).toUpperCase() || "R"}
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
  saving,
  error,
}: {
  balance: number;
  amount: string;
  setAmount: (value: string) => void;
  method: SettlementMethod;
  setMethod: (value: SettlementMethod) => void;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  formatCurrency: (value: number) => string;
  saving: boolean;
  error: string;
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

        {error && (
          <p style={{ margin: "14px 0", color: "#f08b8b", lineHeight: 1.4 }}>
            {error}
          </p>
        )}

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
            Number(amount) > Math.abs(balance) ||
            saving
          }
        >
          {saving ? "Recording…" : "Record payment"}
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
  saving,
  error,
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
  onSave: () => void | Promise<void>;
  formatCurrency: (value: number) => string;
  isEditing: boolean;
  saving: boolean;
  error: string;
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

        {error && (
          <p style={{ margin: "14px 0 0", color: "#f08b8b", lineHeight: 1.4 }}>
            {error}
          </p>
        )}

        <button
          className="save-expense"
          onClick={onSave}
          disabled={saving || !amount || !description.trim()}
        >
          {saving ? "Saving…" : isEditing ? "Save changes" : "Save expense"}
        </button>
      </section>
    </div>
  );
}

export default App;