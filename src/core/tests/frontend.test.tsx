import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import AccountingModule from "../../components/AccountingModule";
import InventoryModule from "../../components/InventoryModule";
import SecurityModule from "../../components/SecurityModule";
import { INITIAL_ACCOUNTS, INITIAL_JOURNAL_ENTRIES, INITIAL_STOCK, INITIAL_WAREHOUSES } from "../../data";

describe("Frontend Components Basic Rendering", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      let data: any = [];
      if (url.includes("cheques")) data = [];
      if (url.includes("fixed-assets")) data = [];
      if (url.includes("bank-recon")) data = [];
      if (url.includes("currency-exchange")) data = [];
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data }),
      });
    }));
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const config = {
    company: "Apex Levant Corp",
    branch: "Cairo Headquarters",
    warehouse: "WH-CAI-01",
    fiscalYear: "FY 2026/2027",
    currency: "EGP",
    language: "English",
    theme: "emerald" as any,
    mode: "dark" as "light" | "dark",
  };

  const user = {
    id: "USR-01",
    username: "admin",
    name: "System Admin",
    role: "SystemAdmin",
    tenantId: "TEN-APEX-01",
  };

  it("renders AccountingModule without crashing", () => {
    const props: any = {
      accounts: INITIAL_ACCOUNTS,
      setAccounts: () => {},
      journalEntries: INITIAL_JOURNAL_ENTRIES,
      setJournalEntries: () => {},
      costCenters: [],
      setCostCenters: () => {},
      profitCenters: [],
      setProfitCenters: () => {},
      customers: [],
      setCustomers: () => {},
      suppliers: [],
      setSuppliers: () => {},
      purchaseInvoices: [],
      setPurchaseInvoices: () => {},
      salesInvoices: [],
      setSalesInvoices: () => {},
      stock: INITIAL_STOCK,
      setStock: () => {},
      cheques: [],
      setCheques: () => {},
      config,
    };
    const { container } = render(<AccountingModule {...props} />);
    expect(container).toBeDefined();
  });

  it("renders InventoryModule without crashing", () => {
    const props: any = {
      stock: INITIAL_STOCK,
      setStock: () => {},
      config,
      warehouses: INITIAL_WAREHOUSES,
      accounts: INITIAL_ACCOUNTS,
      setAccounts: () => {},
      journalEntries: INITIAL_JOURNAL_ENTRIES,
      setJournalEntries: () => {},
    };
    const { container } = render(<InventoryModule {...props} />);
    expect(container).toBeDefined();
  });

  it("renders SecurityModule without crashing", () => {
    const props: any = {
      config,
      setConfig: () => {},
      accounts: INITIAL_ACCOUNTS,
      setAccounts: () => {},
      suppliers: [],
      setSuppliers: () => {},
      customers: [],
      setCustomers: () => {},
      stock: INITIAL_STOCK,
      setStock: () => {},
    };
    const { container } = render(<SecurityModule {...props} />);
    expect(container).toBeDefined();
  });
});
