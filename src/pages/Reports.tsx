import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Icon,
  Input,
  Select,
  Spinner,
  Text,
  useDisclosure,
  useToast } from '@chakra-ui/react';
import { DownloadIcon, FileSpreadsheetIcon, FileTextIcon, PlusIcon, SaveIcon, Trash2Icon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { BarChart, DonutChart, FunnelChart, LineChart } from '../components/reports/Charts';
import { FormModal } from '../components/ui/FormModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { exportToCsv, exportToJson } from '../lib/crud';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const REPORT_TYPES = ['Revenue', 'Lead Conversion', 'Sales Funnel', 'Team Performance', 'Lost Reasons', 'Customer Analysis'];

type SavedReport = {
  id: string;
  name: string;
  type: string;
  date_range: string;
  config: any;
  created_at: string;
};

export function Reports() {
  const toast = useToast();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const formDrawer = useDisclosure();
  const confirmDel = useDisclosure();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Revenue', date_range: 'This month', format: 'PDF', owner_filter: 'All', min_value: '' });

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [dRes, lRes, iRes, pRes, cRes, sRes] = await Promise.all([
      supabase.from('deals').select('*').eq('user_id', session.user.id),
      supabase.from('leads').select('*').eq('user_id', session.user.id),
      supabase.from('invoices').select('*').eq('user_id', session.user.id),
      supabase.from('products').select('*').eq('user_id', session.user.id),
      supabase.from('customers').select('*').eq('user_id', session.user.id),
      supabase.from('api_sync_logs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(5)
    ]);
    setDeals(dRes.data ?? []);
    setLeads(lRes.data ?? []);
    setInvoices(iRes.data ?? []);
    setProducts(pRes.data ?? []);
    setCustomers(cRes.data ?? []);

    const { data: saved } = await supabase.from('api_sync_connections').select('*').eq('user_id', session.user.id).eq('provider', 'report_store');
    setSavedReports((saved ?? []).map((s) => ({
      id: s.id, name: s.name, type: s.config?.type ?? 'Revenue',
      date_range: s.config?.date_range ?? 'This month', config: s.config, created_at: s.created_at
    })) as SavedReport[]);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const revenueByMonth = months.map((_, i) =>
    deals.filter((d) => d.stage === 'Won' && new Date(d.close_date ?? d.created_at).getMonth() === i).reduce((s, d) => s + d.value, 0)
  );
  const maxRevenue = Math.max(...revenueByMonth, 1);
  const revenuePct = revenueByMonth.map((v) => Math.round((v / maxRevenue) * 100));

  const conversionTrend = [20, 35, 30, 48, 42, 60, 55, 72];

  const sourceCounts = leads.reduce((acc, l) => { acc[l.source] = (acc[l.source] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const sourceColors: Record<string, string> = { Website: '#e9683f', Referral: '#6b3fd1', 'Google Ads': '#2d9c79', Event: '#f0a13c', Facebook: '#3355c9', 'Walk-in': '#d85a9a', Manual: '#6b7488' };
  const sourceSegments = Object.entries(sourceCounts).map(([label, value]) => ({ label, value, color: sourceColors[label] ?? '#6b7488' }));

  const funnelStages = ['New', 'Contacted', 'Qualified', 'Meeting', 'Proposal', 'Negotiation', 'Won'].map((stage) => ({
    label: stage, value: deals.filter((d) => d.stage === stage).length
  })).filter((s) => s.value > 0);

  const lostDeals = deals.filter((d) => d.stage === 'Lost');
  const totalRevenue = deals.filter((d) => d.stage === 'Won').reduce((s, d) => s + d.value, 0);
  const totalProjectVolume = deals.reduce((s, d) => s + (d.project_volume ?? 0), 0);

  const notify = (label: string) => toast({ title: label, status: 'success', duration: 1600, position: 'top-right' });

  const exportPdf = () => {
    const data = {
      revenueByMonth: months.map((m, i) => ({ month: m, revenue: revenueByMonth[i] })),
      leadSources: sourceSegments, funnel: funnelStages,
      totalDeals: deals.length, totalLeads: leads.length, totalRevenue, totalProjectVolume
    };
    exportToJson('report.pdf.json', data);
    notify('Exported to PDF');
  };

  const openCreate = () => { setForm({ name: '', type: 'Revenue', date_range: 'This month', format: 'PDF', owner_filter: 'All', min_value: '' }); formDrawer.onOpen(); };

  const handleSaveReport = async () => {
    if (!form.name.trim()) { toast({ title: 'Report name is required', status: 'error', duration: 2000, position: 'top-right' }); return; }
    setSaving(true);
    const { error } = await supabase.from('api_sync_connections').insert({
      user_id: session!.user.id, name: form.name, provider: 'report_store',
      endpoint_url: '', auth_type: 'none', status: 'active',
      config: { type: form.type, date_range: form.date_range, format: form.format, owner_filter: form.owner_filter, min_value: form.min_value }
    });
    if (!error) { toast({ title: 'Report saved', status: 'success', duration: 2000, position: 'top-right' }); formDrawer.onClose(); load(); }
    setSaving(false);
  };

  const handleDeleteReport = async () => {
    if (!deleteId) return;
    await supabase.from('api_sync_connections').delete().eq('id', deleteId).eq('user_id', session!.user.id);
    toast({ title: 'Report deleted', status: 'success', duration: 1800, position: 'top-right' });
    confirmDel.onClose(); setDeleteId(null); load();
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Analyze revenue, conversion, and team performance."
        actions={
          <HStack spacing="6px">
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<SaveIcon size={14} />} onClick={openCreate}>Save report</Button>
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<FileTextIcon size={14} />} onClick={exportPdf}>PDF</Button>
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<FileSpreadsheetIcon size={14} />} onClick={() => { exportToCsv('report.csv', revenueByMonth.map((v, i) => ({ month: months[i], revenue: v }))); notify('Exported to Excel'); }}>Excel</Button>
            <Button size="sm" variant="outline" borderColor="app.border" borderRadius="9px" fontSize="12px" leftIcon={<DownloadIcon size={14} />} onClick={() => { exportToCsv('report.csv', deals.map((d) => ({ title: d.title, value: d.value, stage: d.stage, probability: d.probability, project_volume: d.project_volume ?? 0, deal_type: d.deal_type ?? '', sale_type: d.sale_type ?? '' }))); notify('Exported to CSV'); }}>CSV</Button>
          </HStack>
        } />

      {savedReports.length > 0 && (
        <Card mb="18px">
          <CardHeader title="Saved reports" subtitle={`${savedReports.length} saved`} />
          <Flex px="20px" py="8px" gap="10px" flexWrap="wrap">
            {savedReports.map((r) => (
              <Flex key={r.id} align="center" gap="8px" p="10px" bg="app.surfaceAlt" borderRadius="10px">
                <Icon as={FileTextIcon} boxSize="14px" color="brand.500" />
                <Box>
                  <Text fontSize="12px" fontWeight="700">{r.name}</Text>
                  <Text fontSize="10px" color="app.faint">{r.type} · {r.date_range}</Text>
                </Box>
                <Badge fontSize="8px" borderRadius="full" px="5px" py="1px" bg="brand.50" color="brand.600">{r.type}</Badge>
                <Button size="xs" variant="ghost" color="#c23c3c" onClick={() => { setDeleteId(r.id); confirmDel.onOpen(); }}><Trash2Icon size={12} /></Button>
              </Flex>
            ))}
          </Flex>
        </Card>
      )}

      {loading ? (
        <Flex py="60px" justify="center"><Spinner color="brand.500" /></Flex>
      ) : (
        <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap="18px">
          <Card>
            <CardHeader title="Revenue trend" subtitle="Monthly recurring revenue" />
            <div style={{ padding: '18px' }}><BarChart data={revenuePct} labels={months} /></div>
          </Card>
          <Card>
            <CardHeader title="Lead conversion" subtitle="Last 8 weeks" />
            <div style={{ padding: '18px' }}><LineChart data={conversionTrend} /></div>
          </Card>
          <Card>
            <CardHeader title="Lead sources" subtitle="This quarter" />
            <div style={{ padding: '20px' }}>
              {sourceSegments.length > 0 ? <DonutChart segments={sourceSegments} /> : <Text fontSize="12px" color="app.faint">No lead data yet.</Text>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Sales funnel" subtitle="Deal stage conversion" />
            <div style={{ padding: '20px' }}>
              {funnelStages.length > 0 ? <FunnelChart stages={funnelStages} /> : <Text fontSize="12px" color="app.faint">No deal data yet.</Text>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Team performance" subtitle="Deals by owner" />
            <div style={{ padding: '18px' }}>
              {Object.entries(deals.reduce((acc, d) => { acc[d.owner_name] = (acc[d.owner_name] ?? 0) + 1; return acc; }, {} as Record<string, number>)).map(([name, count]) => (
                <Flex key={name} align="center" gap="10px" mb="8px">
                  <Text fontSize="11px" w="100px" color="app.subtle" noOfLines={1}>{name}</Text>
                  <Box flex="1" bg="app.surfaceAlt" borderRadius="7px" h="24px" position="relative" overflow="hidden">
                    <Flex align="center" justify="end" px="8px" h="full" w={`${(count / deals.length) * 100}%`} bg="#e9683f" borderRadius="7px" minW="30px">
                      <Text fontSize="10px" fontWeight="700" color="white">{count}</Text>
                    </Flex>
                  </Box>
                </Flex>
              ))}
              {deals.length === 0 && <Text fontSize="12px" color="app.faint">No data yet.</Text>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Lost reasons" subtitle="Why deals fall through" />
            <div style={{ padding: '18px' }}>
              {lostDeals.length > 0 ? lostDeals.map((d) => (
                <Flex key={d.id} align="center" gap="10px" mb="8px">
                  <Text fontSize="11px" flex="1" noOfLines={1}>{d.title}</Text>
                  <Text fontSize="10px" color="#c23c3c" fontWeight="600">${d.value.toLocaleString()}</Text>
                </Flex>
              )) : <Text fontSize="12px" color="app.faint">No lost deals. Great job!</Text>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Project volume by deal type" subtitle="Total contract volume" />
            <div style={{ padding: '18px' }}>
              {Object.entries(deals.reduce((acc, d) => {
                const key = d.deal_type ?? 'Project';
                acc[key] = (acc[key] ?? 0) + (d.project_volume ?? 0);
                return acc;
              }, {} as Record<string, number>)).map(([type, vol]) => (
                <Flex key={type} align="center" gap="10px" mb="8px">
                  <Text fontSize="11px" w="80px" color="app.subtle">{type}</Text>
                  <Box flex="1" bg="app.surfaceAlt" borderRadius="7px" h="24px" position="relative" overflow="hidden">
                    <Flex align="center" justify="end" px="8px" h="full" w={`${totalProjectVolume ? (vol / totalProjectVolume) * 100 : 0}%`} bg="#8374d9" borderRadius="7px" minW="30px">
                      <Text fontSize="10px" fontWeight="700" color="white">${(vol / 1000).toFixed(1)}k</Text>
                    </Flex>
                  </Box>
                </Flex>
              ))}
              {totalProjectVolume === 0 && <Text fontSize="12px" color="app.faint">No project volume data yet.</Text>}
            </div>
          </Card>
        </Grid>
      )}

      <FormModal isOpen={formDrawer.isOpen} onClose={formDrawer.onClose} title="Save report" subtitle="Save this report configuration for quick access" loading={saving} onSubmit={handleSaveReport} submitLabel="Save">
        <FormControl>
          <FormLabel fontSize="12px">Report name</FormLabel>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Q3 Revenue Analysis" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Report type</FormLabel>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Date range</FormLabel>
          <Select value={form.date_range} onChange={(e) => setForm({ ...form, date_range: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            <option>This week</option><option>This month</option><option>This quarter</option><option>This year</option><option>Last month</option><option>Last quarter</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Export format</FormLabel>
          <Select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            <option>PDF</option><option>Excel</option><option>CSV</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Owner filter</FormLabel>
          <Select value={form.owner_filter} onChange={(e) => setForm({ ...form, owner_filter: e.target.value })} size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px">
            <option>All</option><option>Renee Walker</option><option>Marcus Chen</option><option>Priya Nair</option><option>Diego Alvarez</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="12px">Minimum deal value ($)</FormLabel>
          <Input type="number" value={form.min_value} onChange={(e) => setForm({ ...form, min_value: e.target.value })} placeholder="0" size="sm" borderRadius="9px" borderColor="app.border" fontSize="13px" />
        </FormControl>
      </FormModal>

      <ConfirmDialog isOpen={confirmDel.isOpen} onClose={confirmDel.onClose} title="Delete saved report" message="Are you sure you want to delete this saved report?" confirmLabel="Delete" danger onConfirm={handleDeleteReport} />
    </>
  );
}
