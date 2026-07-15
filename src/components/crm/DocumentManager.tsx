import React, { useEffect, useState } from 'react';
import { Box, Button, Flex, Spinner, Stack, Text, useToast } from '@chakra-ui/react';
import { FileIcon, FileTextIcon, Trash2Icon, UploadIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type Doc = { id: string; name: string; file_url: string; file_type: string; file_size: number; created_at: string };

export function DocumentManager({ entityType, entityId }: { entityType: 'deal' | 'customer' | 'lead'; entityId: string }) {
  const toast = useToast();
  const { session, profile } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!session?.user || !entityId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('documents').select('*').eq('user_id', session.user.id).eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: false });
      setDocs((data ?? []) as Doc[]);
      setLoading(false);
    })();
  }, [session, entityType, entityId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;
    if (file.size > 25 * 1024 * 1024) { toast({ title: 'File too large (max 25MB)', status: 'error', duration: 3000, position: 'top-right' }); return; }
    setUploading(true);
    const filePath = `${session.user.id}/${entityType}/${entityId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file);
    if (upErr) {
      toast({ title: 'Upload failed', description: 'Storage may not be configured. Saving file reference only.', status: 'warning', duration: 4000, position: 'top-right' });
    }
    const fileUrl = upErr ? `local:${file.name}` : supabase.storage.from('documents').getPublicUrl(filePath).data.publicUrl;
    const { data: docData } = await supabase.from('documents').insert({
      user_id: session.user.id, entity_type: entityType, entity_id: entityId, name: file.name,
      file_url: fileUrl, file_type: file.type || 'file', file_size: file.size,
      uploaded_by_name: profile?.full_name ?? '', uploaded_by_email: profile?.email ?? '',
    }).select().maybeSingle();
    if (docData) setDocs((prev) => [docData as Doc, ...prev]);
    setUploading(false);
    toast({ title: 'Document uploaded', status: 'success', duration: 2000, position: 'top-right' });
    e.target.value = '';
  };

  const handleDelete = async (doc: Doc) => {
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    await supabase.from('documents').delete().eq('id', doc.id).eq('user_id', session!.user.id);
    toast({ title: 'Document deleted', status: 'success', duration: 1800, position: 'top-right' });
  };

  const formatSize = (bytes: number) => bytes < 1024 ? `${bytes}B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)}KB` : `${(bytes / 1048576).toFixed(1)}MB`;

  if (loading) return <Flex py="16px" justify="center"><Spinner size="sm" color="brand.500" /></Flex>;

  return (
    <Stack spacing="8px">
      <Flex as="label" align="center" gap="10px" p="14px" bg="app.surfaceAlt" borderRadius="10px" cursor="pointer" _hover={{ bg: 'app.border' }} transition="background .12s ease">
        <UploadIcon size={16} color="#6b7488" />
        <Text fontSize="12px" color="app.subtle" flex="1">{uploading ? 'Uploading...' : 'Click to upload a file (max 25MB)'}</Text>
        <input type="file" hidden onChange={handleUpload} disabled={uploading} />
        {uploading && <Spinner size="xs" color="brand.500" />}
      </Flex>
      {docs.length === 0 ? (
        <Text fontSize="12px" color="app.faint" py="12px" textAlign="center">No documents uploaded yet.</Text>
      ) : docs.map((doc) => {
        const isImg = doc.file_type.includes('image') || /\.(png|jpe?g|gif|webp)$/i.test(doc.name);
        const isPdf = doc.file_type.includes('pdf') || doc.name.endsWith('.pdf');
        const DIcon = isPdf || isImg ? FileTextIcon : FileIcon;
        return (
          <Flex key={doc.id} align="center" gap="10px" p="12px" bg="app.surface" borderRadius="10px" border="1px solid" borderColor="app.border" _hover={{ borderColor: 'app.subtle' }} transition="border-color .12s ease">
            <Flex w="32px" h="32px" align="center" justify="center" borderRadius="8px" bg="app.surfaceAlt" flexShrink={0}><DIcon size={15} color="#6b7488" /></Flex>
            <Box flex="1" minW="0">
              <Text fontSize="12px" fontWeight="600" noOfLines={1}>{doc.name}</Text>
              <Text fontSize="10px" color="app.faint">{formatSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString()}</Text>
            </Box>
            {!doc.file_url.startsWith('local:') && <Button as="a" href={doc.file_url} target="_blank" size="xs" variant="ghost" fontSize="11px" color="brand.600">View</Button>}
            <Button size="xs" variant="ghost" color="#c23c3c" onClick={() => handleDelete(doc)} p="0" w="28px" h="28px"><Trash2Icon size={13} /></Button>
          </Flex>
        );
      })}
    </Stack>
  );
}
