// Printimi i drafteve të brendshme për blerje/shitje dhe fletëve të magazinës.
// Draftet nuk fiskalizohen nga aplikacioni.
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sb } from "./supabase";
import { s, C, Btn, Card, Chip, ChipRow, Empty, ErrorBox, Field, InfoBox, Loading, SectionTitle, Segmented, today, dShort, money, num, fmt } from "./ui";
import { buildInvoicePdf } from "./print/invoice";
import { buildStockDocPdf } from "./print/stockDoc";
import { printPdf, sharePdf } from "./print/output";

const PAYMENTS = [["cash", "Para në dorë"], ["bank", "Transfertë bankare"], ["card", "Kartë"]];

export default function PrintCenter({ cid, role }) {
  const [tab, setTab] = useState("blerje");
  const [company, setCompany] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [editFiscal, setEditFiscal] = useState(false);
  const [f, setF] = useState({ nipt: "", address: "", city: "", phone: "", email: "", operator_code: "", bank_account: "", vat_payer: true, vat_rate: "20" });
  const [sel, setSel] = useState(null);          // dalja e zgjedhur për faturë shitje
  const [price, setPrice] = useState("");
  const [payment, setPayment] = useState("bank");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const { data: co, error: e0 } = await sb.from("companies").select("*").eq("id", cid).maybeSingle();
    if (e0) setErr(e0.message);
    setCompany(co || null);
    if (co) {
      setF({
        nipt: co.nipt || "", address: co.address || "", city: co.city || "", phone: co.phone || "", email: co.email || "",
        operator_code: co.operator_code || "", bank_account: co.bank_account || "", vat_payer: co.vat_payer !== false,
        vat_rate: String(co.vat_rate ?? 20),
      });
      if (!co.nipt) setEditFiscal(true);
    }
    const [{ data: pu }, { data: mv }] = await Promise.all([
      sb.from("purchases")
        .select("id,date,lot_code,qty_fresh,qty_dry,price,amount,paid,note,farmers(first_name,last_name,id_number,phone,address),products(code,name),zones(code),plots(code,name)")
        .eq("company_id", cid).order("date", { ascending: false }).order("id", { ascending: false }).limit(80),
      sb.from("stock_moves")
        .select("id,date,lot_code,qty_out,kind,counterparty,document_no,products(code,name),customers(name,nipt,address,city),warehouses(name)")
        .eq("company_id", cid).order("date", { ascending: false }).order("id", { ascending: false }).limit(80),
    ]);
    setPurchases(pu || []);
    setMoves((mv || []).filter((m) => Number(m.qty_out) > 0 || m.kind === "out"));
    setLoading(false);
  }, [cid]);
  useEffect(() => { load(); }, [load]);

  const saveFiscal = async () => {
    setBusy(true); setErr("");
    const { error } = await sb.from("companies").update({
      nipt: f.nipt.trim(), address: f.address.trim(), city: f.city.trim(), phone: f.phone.trim(), email: f.email.trim(),
      operator_code: f.operator_code.trim(), bank_account: f.bank_account.trim(),
      vat_payer: !!f.vat_payer, vat_rate: num(f.vat_rate) || 20,
    }).eq("id", cid);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEditFiscal(false);
    load();
  };

  const docMeta = async (kind, id, date) => {
    const { data: number, error } = await sb.rpc("doc_number", { p_kind: kind, p_id: id, p_date: date });
    if (error) throw error;
    return { number: number || "" };
  };

  const companyBlock = () => ({
    name: company?.name || "BioBes", nipt: company?.nipt || "", address: company?.address || "", city: company?.city || "",
    phone: company?.phone || "", email: company?.email || "", operator_code: company?.operator_code || "",
    bank_account: company?.bank_account || "", vat_payer: company?.vat_payer !== false, vat_rate: Number(company?.vat_rate ?? 20),
  });

  const run = async (build, filename) => {
    setBusy(true); setErr("");
    try {
      const bytes = await build();
      await printPdf(bytes, filename);
    } catch (e) {
      if (!/did not complete|cancel/i.test(String(e?.message || ""))) setErr(e.message || "Printimi dështoi");
    }
    setBusy(false);
  };

  const runShare = async (build, filename) => {
    setBusy(true); setErr("");
    try { await sharePdf(await build(), filename); } catch (e) { setErr(e.message || "Ruajtja dështoi"); }
    setBusy(false);
  };

  // ------------------------------------------------------------------ faturë blerje
  const purchaseInvoice = (p) => async () => {
    const meta = await docMeta("fature_blerje", p.id, p.date);
    const qty = Number(p.qty_dry || 0) || Number(p.qty_fresh || 0);
    return buildInvoicePdf({
      company: companyBlock(), kind: "purchase", number: meta.number, issueDate: p.date, supplyDate: p.date,
      seller: {
        name: `${p.farmers?.first_name || ""} ${p.farmers?.last_name || ""}`.trim() || "Fermer",
        nipt: p.farmers?.id_number || "", address: p.farmers?.address || "", city: "", phone: p.farmers?.phone || "",
      },
      buyer: { name: company?.name || "BioBes", nipt: company?.nipt || "", address: company?.address || "", city: company?.city || "" },
      items: [{ description: `${p.products?.name || "Produkt"}${p.lot_code ? ` · Loti ${p.lot_code}` : ""}`, unit: "kg", qty, price: Number(p.price || 0) }],
      payment: "Para në dorë", vatRate: 0, vatPayer: false,
      note: p.note || "",
    });
  };

  const purchaseStockIn = (p) => async () => {
    const meta = await docMeta("flete_hyrje", p.id, p.date);
    return buildStockDocPdf({
      type: "hyrje", number: meta.number, date: p.date, warehouse: "Depo qendrore",
      company: companyBlock(),
      party: {
        name: `${p.farmers?.first_name || ""} ${p.farmers?.last_name || ""}`.trim() || "Fermer",
        nipt: p.farmers?.id_number || "", address: p.farmers?.address || "", phone: p.farmers?.phone || "",
      },
      reference: `Draft blerje ${(await docMeta("fature_blerje", p.id, p.date)).number}`,
      items: [{
        code: p.products?.code || "", name: `${p.products?.name || "Produkt"}${p.lot_code ? ` (loti ${p.lot_code})` : ""}`,
        unit: "kg", qty: Number(p.qty_dry || 0) || Number(p.qty_fresh || 0), price: Number(p.price || 0),
      }],
      note: p.note || "",
    });
  };

  // ------------------------------------------------------------------ faturë shitje
  const saleInvoice = (m) => async () => {
    const unitPrice = num(price);
    if (!(unitPrice > 0)) throw new Error("Shkruani çmimin e shitjes për të krijuar draftin.");
    const meta = await docMeta("fature_shitje", m.id, m.date);
    return buildInvoicePdf({
      company: companyBlock(), kind: "sale", number: meta.number, issueDate: today(), supplyDate: m.date,
      seller: { name: company?.name || "BioBes", nipt: company?.nipt || "", address: company?.address || "", city: company?.city || "" },
      buyer: {
        name: m.customers?.name || m.counterparty || "Klient",
        nipt: m.customers?.nipt || "", address: m.customers?.address || "", city: m.customers?.city || "",
      },
      items: [{
        description: `${m.products?.name || "Produkt"}${m.lot_code ? ` · Loti ${m.lot_code}` : ""}`,
        unit: "kg", qty: Number(m.qty_out || 0), price: unitPrice,
      }],
      payment: (PAYMENTS.find(([k]) => k === payment) || [, "Transfertë bankare"])[1],
    });
  };

  const moveStockOut = (m) => async () => {
    const meta = await docMeta("flete_dalje", m.id, m.date);
    return buildStockDocPdf({
      type: "dalje", number: m.document_no || meta.number, date: m.date,
      warehouse: m.warehouses?.name || "Depo qendrore", company: companyBlock(),
      party: { name: m.customers?.name || m.counterparty || "Marrës", nipt: m.customers?.nipt || "", city: m.customers?.city || "" },
      reference: m.kind === "export" ? "Eksport" : "",
      items: [{
        code: m.products?.code || "", name: `${m.products?.name || "Produkt"}${m.lot_code ? ` (loti ${m.lot_code})` : ""}`,
        unit: "kg", qty: Number(m.qty_out || 0), price: num(price) || 0,
      }],
      note: "",
    });
  };

  const buyerSuffix = (m) => (m.customers?.name || m.counterparty || "klient").replace(/\s+/g, "-").slice(0, 20);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Printo</Text>
      <Text style={[s.sub, { marginTop: 4 }]}>Drafte të brendshme për blerje dhe shitje, dhe fletë magazine.</Text>
      <InfoBox icon="warning-outline" tone="warn">
        Draftet e blerjes dhe shitjes nuk janë fatura të fiskalizuara. Aplikacioni nuk i dërgon për fiskalizim. Për faturë fiskale përdorni sistemin përkatës.
      </InfoBox>

      {/* ---------------------------------------------------------------- të dhënat fiskale */}
      <SectionTitle right={!editFiscal ? <TouchableOpacity onPress={() => setEditFiscal(true)}><Text style={{ color: C.brand, fontWeight: "700", fontSize: 13 }}>Ndrysho</Text></TouchableOpacity> : null}>
        Të dhënat fiskale
      </SectionTitle>

      {!editFiscal ? (
        <Card>
          <Text style={{ fontWeight: "800", color: C.ink }}>{company?.name || "—"}</Text>
          <Text style={s.mute}>NIPT: {company?.nipt || "—"}</Text>
          <Text style={s.mute}>{[company?.address, company?.city].filter(Boolean).join(", ") || "Pa adresë"}</Text>
          <ChipRow style={{ marginTop: 8 }}>
            <Chip label={company?.vat_payer ? `TVSH ${company?.vat_rate ?? 20}%` : "Pa TVSH"} tone={company?.vat_payer ? "brand" : "neutral"} />
            {!!company?.operator_code && <Chip label={`Operator ${company.operator_code}`} />}
          </ChipRow>
        </Card>
      ) : (
        <Card>
          <Field label="NIPT" value={f.nipt} onChangeText={(v) => setF({ ...f, nipt: v })} autoCapitalize="characters" placeholder="L12345678A" />
          <Field label="Adresa" value={f.address} onChangeText={(v) => setF({ ...f, address: v })} placeholder="Rr. Kavajës 12" />
          <Field label="Qyteti" value={f.city} onChangeText={(v) => setF({ ...f, city: v })} placeholder="Tiranë" />
          <Field label="Telefon" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" />
          <Field label="Email" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Kodi i operatorit" value={f.operator_code} onChangeText={(v) => setF({ ...f, operator_code: v })} placeholder="OP-01" />
          <Field label="Llogaria bankare (IBAN)" value={f.bank_account} onChangeText={(v) => setF({ ...f, bank_account: v })} autoCapitalize="characters" />
          <Field label="Norma e TVSH-së (%)" value={f.vat_rate} onChangeText={(v) => setF({ ...f, vat_rate: v })} keyboardType="decimal-pad" />
          <TouchableOpacity onPress={() => setF({ ...f, vat_payer: !f.vat_payer })} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
            <Ionicons name={f.vat_payer ? "checkbox" : "square-outline"} size={20} color={f.vat_payer ? C.ok : C.mute} />
            <Text style={{ color: C.text }}>Jemi pagues të TVSH-së</Text>
          </TouchableOpacity>
          <Btn title="Ruaj të dhënat" icon="checkmark-circle-outline" onPress={saveFiscal} busy={busy} disabled={!f.nipt.trim()} />
          <Btn title="Anulo" alt onPress={() => setEditFiscal(false)} />
        </Card>
      )}

      <SectionTitle>Dokumentet</SectionTitle>
      <Segmented options={[["blerje", "Blerjet"], ["dalje", "Daljet"]]} value={tab} onChange={setTab} />

      {!!err && <ErrorBox message={err} />}
      {loading && <Loading text="Po ngarkohen dokumentet…" />}

      {/* ---------------------------------------------------------------- blerjet */}
      {!loading && tab === "blerje" && (purchases.length === 0 ? (
        <Empty icon="basket-outline" title="Pa blerje" text="Regjistroni një blerje për të krijuar draftin e saj." />
      ) : purchases.map((p) => (
        <Card key={p.id}>
          <View style={s.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.ink }} numberOfLines={1}>
                {p.products?.name || "Produkt"} · {fmt(Number(p.qty_dry || 0) || Number(p.qty_fresh || 0))} kg
              </Text>
              <Text style={s.mute} numberOfLines={1}>
                {dShort(p.date)} · {`${p.farmers?.first_name || ""} ${p.farmers?.last_name || ""}`.trim() || "pa fermer"}
                {p.lot_code ? ` · ${p.lot_code}` : ""}
              </Text>
            </View>
            <Text style={{ fontWeight: "800", color: C.brand }}>{money(p.amount)}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <SmallBtn label="Draft blerje" icon="document-text-outline" onPress={() => run(purchaseInvoice(p), `Draft-blerje-${p.id}.pdf`)} busy={busy} />
            <SmallBtn label="Fletë hyrje" icon="log-in-outline" onPress={() => run(purchaseStockIn(p), `Flete-hyrje-${p.id}.pdf`)} busy={busy} />
            <SmallBtn label="Nda" icon="share-outline" alt onPress={() => runShare(purchaseInvoice(p), `Draft-blerje-${p.id}.pdf`)} busy={busy} />
          </View>
        </Card>
      )))}

      {/* ---------------------------------------------------------------- daljet */}
      {!loading && tab === "dalje" && (moves.length === 0 ? (
        <Empty icon="cube-outline" title="Pa dalje" text="Daljet regjistrohen te Magazina; draftet e shitjes dalin prej tyre." />
      ) : moves.map((m) => (
        <Card key={m.id}>
          <View style={s.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.ink }} numberOfLines={1}>
                {m.products?.name || "Produkt"} · {fmt(m.qty_out)} kg
              </Text>
              <Text style={s.mute} numberOfLines={1}>
                {dShort(m.date)} · {m.customers?.name || m.counterparty || "pa marrës"}{m.document_no ? ` · ${m.document_no}` : ""}
              </Text>
            </View>
            {!!sel && sel.id === m.id ? <Chip label="Zgjedhur" tone="brand" /> : null}
          </View>

          {sel && sel.id === m.id ? (
            <View style={{ marginTop: 6 }}>
              <Field label="Çmimi i shitjes (lekë/kg)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0,00" />
              <Segmented options={PAYMENTS} value={payment} onChange={setPayment} />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <SmallBtn label="Draft shitje" icon="document-text-outline" onPress={() => run(saleInvoice(m), `Draft-shitje-${m.id}.pdf`)} busy={busy} />
                <SmallBtn label="Fletë dalje" icon="log-out-outline" onPress={() => run(moveStockOut(m), `Flete-dalje-${m.id}.pdf`)} busy={busy} />
                <SmallBtn label="Nda" icon="share-outline" alt onPress={() => runShare(saleInvoice(m), `Draft-shitje-${m.id}.pdf`)} busy={busy} />
              </View>
              <Btn title="Mbyll" alt onPress={() => { setSel(null); setPrice(""); }} />
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <SmallBtn label="Draft shitje" icon="document-text-outline" onPress={() => { setSel(m); setPrice(""); }} />
              <SmallBtn label="Fletë dalje" icon="log-out-outline" onPress={() => run(moveStockOut(m), `Flete-dalje-${m.id}.pdf`)} busy={busy} />
            </View>
          )}
        </Card>
      )))}
    </ScrollView>
  );
}

const SmallBtn = ({ label, icon, onPress, busy, alt }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={busy}
    style={[{
      flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
      backgroundColor: alt ? C.surface : C.brand, opacity: busy ? 0.5 : 1, borderWidth: alt ? 1 : 0, borderColor: C.line,
    }]}
    activeOpacity={0.85}
  >
    <Ionicons name={icon} size={15} color={alt ? C.brand : "#fff"} />
    <Text style={{ color: alt ? C.brand : "#fff", fontWeight: "700", fontSize: 12.5 }}>{label}</Text>
  </TouchableOpacity>
);
