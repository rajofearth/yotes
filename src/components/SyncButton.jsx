import React, { useEffect, useState, useMemo } from 'react';
import { useNotes } from '../hooks/useNotes';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { openDB } from '../utils/indexedDB';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { encryptString } from '../lib/e2ee';

const SyncButton = () => {
	const isOnline = useOnlineStatus();
	const { convexUserId, isE2EEReady } = useNotes();
	const showToast = useToast();
	const [isAnimating, setIsAnimating] = useState(false);
	const [hasLocalYotes, setHasLocalYotes] = useState(false);
	const [migrating, setMigrating] = useState(false);
	const [complete, setComplete] = useState(false);
	const [progress, setProgress] = useState(0);
	const [message, setMessage] = useState('');

	const upsertTag = useMutation(api.tags.create);
	const upsertNote = useMutation(api.notes.create);
	const sessionExternalId = (typeof window !== 'undefined' && window.localStorage) ? (() => {
		try {
			// attempt to get session from IndexedDB or rely on upstream contexts; fallback to undefined
			return null;
		} catch { return null; }
	})() : null;
	const existingTags = useQuery(api.tags.secureList, sessionExternalId || convexUserId ? { externalId: sessionExternalId || '' } : 'skip');
	const existingNotes = useQuery(api.notes.secureList, sessionExternalId || convexUserId ? { externalId: sessionExternalId || '' } : 'skip');
	const existingTagMap = useMemo(() => {
		if (!Array.isArray(existingTags)) return new Map();
		const m = new Map();
		for (const t of existingTags) {
			// We cannot decrypt here without DEK; just map by id
			m.set(String(t._id), t._id);
		}
		return m;
	}, [existingTags]);

	// Detect legacy YotesDB (IndexedDB) presence
	useEffect(() => {
		let cancelled = false;
		const check = async () => {
			try { await openDB(); if (!cancelled) setHasLocalYotes(true); }
			catch { if (!cancelled) setHasLocalYotes(false); }
		};
		check();
		return () => { cancelled = true; };
	}, []);

	useEffect(() => {
		if (hasLocalYotes) {
			setIsAnimating(true);
			const t = setTimeout(() => setIsAnimating(false), 1500);
			return () => clearTimeout(t);
		}
	}, [hasLocalYotes]);

	const migrate = async () => {
		if (migrating) return;
		if (!isOnline) { showToast('Connect to the internet to migrate.', 'info'); return; }
		if (!convexUserId) { showToast('Please wait, preparing your account...', 'info'); return; }
		if (!isE2EEReady) { showToast('Unlock encryption first to migrate.', 'info'); return; }
		setMigrating(true);
		setComplete(false);
		setProgress(5);
		setMessage('Opening local database...');
		try {
			const db = await openDB();
			setProgress(10); setMessage('Reading local tags and notes...');
			const tags = await new Promise((resolve) => { const r = db.transaction('tags').objectStore('tags').get('tags_data'); r.onsuccess = () => resolve(r.result?.value || []); r.onerror = () => resolve([]); });
			const notes = await new Promise((resolve) => { const r = db.transaction('notes').objectStore('notes').get('notes_data'); r.onsuccess = () => resolve(r.result?.value || []); r.onerror = () => resolve([]); });
			const total = (tags?.length || 0) + (notes?.length || 0);
			let done = 0;

			const nameToId = new Map();
			const legacyIdToConvexId = new Map();

			setMessage(`Migrating ${tags.length} tags...`);
			for (const t of tags) {
				const legacyId = t?.id || t?.uuid || t?.name;
				const name = String(t?.name || '').trim();
				const color = t?.color || 'bg-gray-500/20 text-gray-500';
				let convexTagId = name ? nameToId.get(name.toLowerCase()) : undefined;
				if (!convexTagId && name) {
					try {
						const nameEnc = await encryptString(window.__yotesDek, name);
						const colorEnc = await encryptString(window.__yotesDek, color);
						const created = await upsertTag({ userId: convexUserId, nameEnc, colorEnc });
						convexTagId = created?._id || created?.id || created;
						if (convexTagId) nameToId.set(name.toLowerCase(), convexTagId);
					} catch (e) {
						// continue
					}
				}
				if (legacyId && convexTagId) legacyIdToConvexId.set(legacyId, convexTagId);
				done++; setProgress(10 + Math.floor((done/Math.max(total,1))*80));
			}

			setMessage(`Migrating ${notes.length} notes...`);
			for (const n of notes) {
				const legacyTags = Array.isArray(n?.tags) ? n.tags : [];
				const mappedTags = legacyTags.map((lt) => legacyIdToConvexId.get(lt)).filter(Boolean);
				try {
					const titleEnc = n?.title ? await encryptString(window.__yotesDek, n.title) : undefined;
					const descriptionEnc = n?.description ? await encryptString(window.__yotesDek, n.description) : undefined;
					const contentEnc = n?.content ? await encryptString(window.__yotesDek, n.content) : undefined;
					await upsertNote({ userId: convexUserId, titleEnc, descriptionEnc, contentEnc, tags: mappedTags });
				} catch (e) {
					// continue
				}
				done++; setProgress(10 + Math.floor((done/Math.max(total,1))*80));
			}

			setProgress(100); setMessage('Migration completed');
			setComplete(true);
			showToast('Local migration complete', 'success');
		} catch (e) {
			showToast('Migration failed', 'error');
		} finally {
			setMigrating(false);
		}
	};

	// UI states
	const convexHasData = (Array.isArray(existingNotes) && existingNotes.length > 0) || (Array.isArray(existingTags) && existingTags.length > 0);
	if (migrating) {
		return (
			<div className="fixed bottom-24 right-4 z-50 bg-bg-primary text-text-primary/80 rounded-full p-4 shadow-lg flex items-center gap-2 ring-1 ring-overlay/20" title={message || 'Migrating...'} role="status" aria-label="Migrating data">
				<Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
				<span className="text-xs whitespace-nowrap pr-1 max-w-[180px] overflow-hidden text-ellipsis">{message ? message.substring(0, 40) : 'Migrating...'}</span>
				<span className="text-[10px] text-text-primary/50">{progress}%</span>
			</div>
		);
	}

	if (convexHasData) {
		return null;
	}

	if (complete && isOnline) {
		return (
			<button onClick={migrate} className={`fixed bottom-24 right-4 z-50 bg-bg-primary text-text-primary hover:bg-overlay/10 rounded-full p-4 shadow-lg flex items-center justify-center transition-all duration-300 ring-1 ring-overlay/20 ${isAnimating ? 'animate-pulse' : ''}`} title="Migration complete. Click to run again if needed.">
				<CheckCircle2 className="h-5 w-5 text-green-500" />
			</button>
		);
	}

	if (isOnline && hasLocalYotes) {
		return (
			<button onClick={migrate} disabled={!isOnline} className={`fixed bottom-24 right-4 z-50 bg-bg-primary text-text-primary hover:bg-overlay/10 rounded-full p-4 shadow-lg flex items-center justify-center transition-all duration-300 ring-1 ring-overlay/20 ${isAnimating ? 'animate-pulse' : ''} disabled:opacity-50 disabled:pointer-events-none`} title={isOnline ? 'Migrate your local data to Convex' : 'Connect to internet to migrate'}>
				<Upload className="h-5 w-5 text-gray-400" />
				<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">!</span>
			</button>
		);
	}

	return null;
};

export default SyncButton; 