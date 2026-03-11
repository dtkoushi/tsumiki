import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    Layout,
    Plus,
    Download,
    Upload,
    Github,
    Share2,
    PanelRight,
    ChevronDown,
    ChevronRight,
    Copy,
    Check,
    X,
    Menu,
    Pencil
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTsumikiStore } from '../../store/useTsumikiStore';
import type { CardType } from '../../types';
import { serializeProject, deserializeProject, compressToUrl } from '../../lib/utils/serialization';
import { toast } from '../common/toast';
import { Button } from '../common/Button';
import { CardNavigator } from '../stack/CardNavigator';
import { PinnedInputsPanel } from '../stack/PinnedInputsPanel';
import { ja } from '../../lib/i18n/ja';
import { registry } from '../../lib/registry';

interface AppLayoutProps {
    children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const { meta, cards, pinnedOutputs, pinnedInputs, addCard, loadProject, updateMeta } = useTsumikiStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showNavigator, setShowNavigator] = useState(false);
    const [showPinnedInputs, setShowPinnedInputs] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [editingField, setEditingField] = useState<'title' | 'author' | null>(null);
    const [editValue, setEditValue] = useState('');
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const sharePopoverRef = useRef<HTMLDivElement>(null);
    const shareWrapperRef = useRef<HTMLDivElement>(null);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toggleCategory = (id: string) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleExport = () => {
        const jsonString = serializeProject(meta, cards, pinnedOutputs, pinnedInputs);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tsumiki-project-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const data = deserializeProject(text);
            if (data) {
                if (confirm(ja['toast.loadConfirm'])) {
                    loadProject(data.cards, data.meta.title, data.meta.author, data.pinnedOutputs ?? [], data.meta.memo, data.pinnedInputs ?? []);
                }
            } else {
                toast(ja['toast.importFailed'], 'error');
            }
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.onerror = () => toast(ja['toast.readFailed'], 'error');
        reader.readAsText(file);
    };

    const handleShare = () => {
        if (shareUrl) {
            handleCloseShare();
            return;
        }
        const hash = compressToUrl(meta, cards, pinnedOutputs, pinnedInputs);
        const url = `${window.location.origin}${window.location.pathname}?data=${hash}`;
        setShareUrl(url);
        setCopied(false);
    };

    const handleCopyUrl = useCallback(() => {
        if (!shareUrl) return;
        const markCopied = () => {
            setCopied(true);
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
        };
        const doFallbackCopy = () => {
            const ta = document.createElement('textarea');
            ta.value = shareUrl;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            if (ok) markCopied();
        };
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(markCopied).catch(doFallbackCopy);
        } else {
            doFallbackCopy();
        }
    }, [shareUrl]);

    const handleCloseShare = useCallback(() => {
        setShareUrl(null);
        setCopied(false);
        if (copyTimerRef.current) {
            clearTimeout(copyTimerRef.current);
            copyTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!shareUrl) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleCloseShare();
        };
        const handleClickOutside = (e: MouseEvent) => {
            if (shareWrapperRef.current && !shareWrapperRef.current.contains(e.target as Node)) {
                handleCloseShare();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [shareUrl, handleCloseShare]);


    useEffect(() => {
        if (pinnedInputs.length > 0) setShowPinnedInputs(true);
    }, [pinnedInputs.length]);

    interface CardItem { type: CardType; label: string; desc: string }
    interface CategoryDef { id: string; label: string; items: CardItem[] }

    const CATEGORY_ORDER: Record<string, number> = {
        material:      1,
        section:       2,
        beam:          3,
        cross_section: 4,
        balance:       5,
        verify:        6,
        utility:       7,
    };
    const CATEGORY_LABELS: Record<string, string> = {
        material:      ja['sidebar.category.material'],
        section:       ja['sidebar.category.section'],
        beam:          ja['sidebar.category.beam'],
        cross_section: ja['sidebar.category.cross_section'],
        balance:       ja['sidebar.category.balance'],
        verify:        ja['sidebar.category.verify'],
        utility:       ja['sidebar.category.utility'],
    };

    const cardCategories: CategoryDef[] = (() => {
        const grouped: Record<string, CardItem[]> = {};
        for (const def of registry.getAll()) {
            if (!def.sidebar) continue;
            const { category } = def.sidebar;
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push({
                type: def.type as CardType,
                label: def.title,
                desc: def.description ?? '',
            });
        }
        // Sort items within each category by sidebar.order
        for (const category of Object.keys(grouped)) {
            grouped[category].sort((a, b) => {
                const orderA = registry.get(a.type)?.sidebar?.order ?? 999;
                const orderB = registry.get(b.type)?.sidebar?.order ?? 999;
                return orderA - orderB;
            });
        }
        return Object.keys(grouped)
            .sort((a, b) => (CATEGORY_ORDER[a] ?? 99) - (CATEGORY_ORDER[b] ?? 99))
            .map(id => ({ id, label: CATEGORY_LABELS[id] ?? id, items: grouped[id] }));
    })();

    return (
        <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">
            {/* Mobile backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar / Drawer */}
            <aside className={clsx(
                "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col h-full shadow-lg transition-transform duration-300 shrink-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}>
                <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white shadow-blue-200 shadow-md">
                        <Layout size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight tracking-tight">Tsumiki</h1>
                        <p className="text-[10px] text-slate-400 font-medium">{ja['app.subtitle']}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cardCategories.map((category) => {
                        const isCollapsed = collapsedCategories.has(category.id);
                        return (
                            <div key={category.id}>
                                <button
                                    onClick={() => toggleCategory(category.id)}
                                    aria-expanded={!isCollapsed}
                                    aria-label={isCollapsed ? 'Expand category' : 'Collapse category'}
                                    className="w-full flex items-center justify-between px-1 mb-2 group"
                                >
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        {category.label}
                                    </h3>
                                    {isCollapsed
                                        ? <ChevronRight size={12} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                                        : <ChevronDown  size={12} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                                    }
                                </button>
                                {!isCollapsed && (
                                    <div className="grid gap-2">
                                        {category.items.map((item) => (
                                            <button
                                                key={item.type}
                                                onClick={() => addCard(item.type)}
                                                className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm transition-all text-left group bg-white"
                                            >
                                                <div className="bg-slate-100 p-1.5 rounded text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                    <Plus size={16} />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">{item.label}</div>
                                                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.desc}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">{ja['ui.projectInfo']}</h3>
                        <div className="px-1 space-y-1">
                            {editingField === 'title' ? (
                                <input
                                    autoFocus
                                    className="text-sm font-medium w-full border-b border-blue-400 outline-none bg-transparent text-slate-700"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onBlur={() => { updateMeta({ title: editValue.trim() || meta.title }); setEditingField(null); }}
                                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                                />
                            ) : (
                                <div
                                    className="text-sm font-medium text-slate-700 cursor-pointer hover:text-blue-600 flex items-center gap-1 group"
                                    onClick={() => { setEditValue(meta.title); setEditingField('title'); }}
                                >
                                    {meta.title}
                                    <Pencil size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                                </div>
                            )}
                            {editingField === 'author' ? (
                                <input
                                    autoFocus
                                    className="text-xs w-full border-b border-blue-400 outline-none bg-transparent text-slate-500"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onBlur={() => { updateMeta({ author: editValue.trim() || meta.author }); setEditingField(null); }}
                                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                                />
                            ) : (
                                <div
                                    className="text-xs text-slate-500 cursor-pointer hover:text-blue-600 flex items-center gap-1 group"
                                    onClick={() => { setEditValue(meta.author); setEditingField('author'); }}
                                >
                                    {ja['ui.author']}{meta.author}
                                    <Pencil size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                                </div>
                            )}
                            <div className="mt-2">
                                <div className="text-xs text-slate-400 mb-0.5">{ja['ui.projectMemo']}</div>
                                <textarea
                                    className="w-full text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-1.5 resize-none focus:outline-none focus:border-blue-300 min-h-[48px]"
                                    placeholder={ja['ui.projectMemoPlaceholder']}
                                    value={meta.memo ?? ''}
                                    onChange={e => updateMeta({ memo: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 text-xs text-slate-400 flex justify-between items-center">
                    <span>v0.4.1</span>
                    <a href="https://github.com/dtkoushi/tsumiki" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600"><Github size={14} /></a>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="h-14 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center px-3 sm:px-6 justify-between shrink-0 z-10 sticky top-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <button
                            onClick={() => setSidebarOpen(v => !v)}
                            className="lg:hidden p-2 rounded-md hover:bg-slate-100 text-slate-600 shrink-0"
                            aria-label="メニューを開く"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0 hidden lg:flex">
                            <span className="font-medium text-slate-900">{ja['ui.workspace']}</span>
                            <span>/</span>
                            <span className="truncate">{meta.title}</span>
                        </div>
                    </div>
                    <div className="flex gap-1.5 sm:gap-2 shrink-0">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json"
                            className="hidden"
                        />
                        <Button onClick={handleImportClick} leftIcon={<Upload size={14} />}>
                            <span className="hidden sm:inline">{ja['ui.import']}</span>
                        </Button>
                        <Button onClick={handleExport} leftIcon={<Download size={14} />}>
                            <span className="hidden sm:inline">{ja['ui.export']}</span>
                        </Button>
                        <div className="relative" ref={shareWrapperRef}>
                            <Button variant="primary" onClick={handleShare} leftIcon={<Share2 size={14} />}>
                                <span className="hidden sm:inline">{ja['ui.share']}</span>
                            </Button>
                            {shareUrl && (
                                <div
                                    ref={sharePopoverRef}
                                    className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-50"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-slate-600">共有リンク</span>
                                        <button
                                            onClick={handleCloseShare}
                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={shareUrl}
                                            onClick={e => (e.target as HTMLInputElement).select()}
                                            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-700 font-mono min-w-0 cursor-text"
                                        />
                                        <button
                                            onClick={handleCopyUrl}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                                copied
                                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                        >
                                            {copied ? <Check size={12} /> : <Copy size={12} />}
                                            {copied ? 'コピー済み' : 'コピー'}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2">
                                        このURLを共有すると、現在のカードスタックを再現できます
                                    </p>
                                </div>
                            )}
                        </div>
                        <Button
                            onClick={() => setShowNavigator(v => !v)}
                            leftIcon={<PanelRight size={14} />}
                            title={ja['ui.toggleNavigator']}
                        >
                            <span className="hidden sm:inline">{ja['ui.navigator']}</span>
                        </Button>
                    </div>
                </header>

                {/* Stack Scroll Area + Navigator */}
                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative">
                        <div className="max-w-3xl mx-auto pb-20">
                            {children}
                        </div>
                    </div>
                    {showPinnedInputs && pinnedInputs.length > 0 && (
                        <PinnedInputsPanel onClose={() => setShowPinnedInputs(false)} />
                    )}
                    {showNavigator && <CardNavigator />}
                </div>
            </main>
        </div>
    );
};
