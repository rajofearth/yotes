import React, { useEffect, useState, useMemo } from 'react';
import { useNotes } from '../hooks/useNotes';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { Loader2, Upload, CheckCircle2, RotateCw } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { openDB } from '../utils/indexedDB';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const SyncButton = () => {
	const isOnline = useOnlineStatus();
	const { convexUserId } = useNotes();
	const showToast = useToast();
	const [isAnimating, setIsAnimating] = useState(false);
	const [hasLocalYotes, setHasLocalYotes] = useState(false);
	const [migrating, setMigrating] = useState(false);
	const [complete, setComplete] = useState(false);
	const [progress, setProgress] = useState(0);
	const [message, setMessage] = useState('');

	const upsertTag = useMutation(api.tags.create);
	const upsertNote = useMutation(api.notes.create);
	const existingTags = useQuery(api.tags.list, convexUserId ? { userId: convexUserId } : 'skip');
	const existingTagMap = useMemo(() => {
		if (!Array.isArray(existingTags)) return new Map();
		const m = new Map();
		for (const t of existingTags) {
			if (t?.name) m.set(String(t.name).toLowerCase(), t._id);
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
		setMigrating(true);
		setComplete(false);
		setProgress(5);
		setMessage('Opening local database...');
		console.log('[Migration] Starting');
		try {
			const db = await openDB();
			setProgress(10); setMessage('Reading local tags and notes...');
			const tags = await new Promise((resolve) => { const r = db.transaction('tags').objectStore('tags').get('tags_data'); r.onsuccess = () => resolve(r.result?.value || []); r.onerror = () => resolve([]); });
			const notes = await new Promise((resolve) => { const r = db.transaction('notes').objectStore('notes').get('notes_data'); r.onsuccess = () => resolve(r.result?.value || []); r.onerror = () => resolve([]); });
			console.log('[Migration] Loaded', { tags: tags?.length || 0, notes: notes?.length || 0 });
			const total = (tags?.length || 0) + (notes?.length || 0);
			let done = 0;

			// Build mapping from legacy tag id and name to Convex tag Id
			const nameToId = new Map(existingTagMap);
			const legacyIdToConvexId = new Map();

			setMessage(`Migrating ${tags.length} tags...`);
			for (const t of tags) {
				const legacyId = t?.id || t?.uuid || t?.name;
				const name = String(t?.name || '').trim();
				const color = t?.color || 'bg-gray-500/20 text-gray-500';
				let convexTagId = name ? nameToId.get(name.toLowerCase()) : undefined;
				if (!convexTagId && name) {
					try {
						const created = await upsertTag({ userId: convexUserId, name, color });
						convexTagId = created?._id || created?.id || created;
						if (convexTagId) nameToId.set(name.toLowerCase(), convexTagId);
						console.log('[Migration] Tag created', name, convexTagId);
					} catch (e) {
						console.warn('[Migration] Tag create error (continuing):', e);
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
					await upsertNote({
						userId: convexUserId,
						title: n?.title || undefined,
						description: n?.description || undefined,
						content: n?.content || undefined,
						tags: mappedTags,
					});
					console.log('[Migration] Note created', n?.title || n?.id);
				} catch (e) {
					console.warn('[Migration] Note create error (continuing):', e);
				}
				done++; setProgress(10 + Math.floor((done/Math.max(total,1))*80));
			}

			setProgress(100); setMessage('Migration completed');
			setComplete(true);
			showToast('Local migration complete', 'success');
			console.log('[Migration] Completed');
		} catch (e) {
			showToast('Migration failed', 'error');
			console.error('[Migration] Error:', e);
		} finally {
			setMigrating(false);
		}
	};

	// UI states
	if (migrating) {
		return (
			<div className="fixed bottom-24 right-4 z-50 bg-bg-primary text-text-primary/80 rounded-full p-4 shadow-lg flex items-center gap-2 ring-1 ring-overlay/20" title={message || 'Migrating...'} role="status" aria-label="Migrating data">
				<Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
				<span className="text-xs whitespace-nowrap pr-1 max-w-[180px] overflow-hidden text-ellipsis">{message ? message.substring(0, 40) : 'Migrating...'}</span>
				<span className="text-[10px] text-text-primary/50">{progress}%</span>
			</div>
		);
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

	if (isOnline && !hasLocalYotes && !complete) {
		return (
			<button onClick={migrate} className={`fixed bottom-24 right-4 z-50 bg-bg-primary text-text-primary hover:bg-overlay/10 rounded-full p-3 shadow-lg flex items-center justify-center transition-all duration-300 ring-1 ring-overlay/20`} title="Migrate local data to Convex">
				<RotateCw className="h-4 w-4 text-gray-400" />
			</button>
		);
	}

	return null;
};

export default SyncButton; 