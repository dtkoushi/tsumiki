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
    X
} from 'lucide-react';
import { useTsumikiStore } from '../../store/useTsumikiStore';
import type { CardType } from '../../types';
import { serializeProject, deserializeProject, compressToUrl } from '../../lib/utils/serialization';
import { toast } from '../common/toast';
import { Button } from '../common/Button';
import { CardNavigator } from '../stack/CardNavigator';
import { ja } from '../../lib/i18n/ja';
import { registry } from '../../lib/registry';

interface AppLayoutProps {
    children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const { meta, cards, pinnedOutputs, addCard, loadProject } = useTsumikiStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showNavigator, setShowNavigator] = useState(false);
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const sharePopoverRef = useRef<HTMLDivElement>(null);
    const toggleCategory = (id: string) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleExport = () => {
        const jsonString = serializeProject(meta, cards, pinnedOutputs);
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
                    loadProject(data.cards, data.meta.title, data.meta.author, data.pinnedOutputs ?? []);
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
        const hash = compressToUrl(meta, cards, pinnedOutputs);
        const url = `${window.location.origin}${window.location.pathname}?data=${hash}`;
        setShareUrl(url);
        setCopied(false);
    };

    const handleCopyUrl = useCallback(() => {
        if (!shareUrl) return;
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
            if (ok) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        };
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl)
                .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                })
                .catch(doFallbackCopy);
        } else {
            doFallbackCopy();
        }
    }, [shareUrl]);

    const handleCloseShare = useCallback(() => {
        setShareUrl(null);
        setCopied(false);
    }, []);

    useEffect(() => {
        if (!shareUrl) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleCloseShare();
        };
        const handleClickOutside = (e: MouseEvent) => {
            if (sharePopoverRef.current && !sharePopoverRef.current.contains(e.target as Node)) {
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
            {/* Sidebar / Drawer */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shadow-lg z-10">
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
                        <div className="px-1">
                            <div className="text-sm font-medium text-slate-700">{meta.title}</div>
                            <div className="text-xs text-slate-500">{ja['ui.author']}{meta.author}</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 text-xs text-slate-400 flex justify-between items-center">
                    <span>v0.1.0 MVP</span>
                    <a href="#" className="hover:text-slate-600"><Github size={14} /></a>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="h-14 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center px-6 justify-between shrink-0 z-10 sticky top-0">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="font-medium text-slate-900">{ja['ui.workspace']}</span>
                        <span>/</span>
                        <span>{meta.title}</span>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json"
                            className="hidden"
                        />
                        <Button onClick={handleImportClick} leftIcon={<Upload size={14} />}>
                            {ja['ui.import']}
                        </Button>
                        <Button onClick={handleExport} leftIcon={<Download size={14} />}>
                            {ja['ui.export']}
                        </Button>
                        <div className="relative">
                            <Button variant="primary" onClick={handleShare} leftIcon={<Share2 size={14} />}>
                                {ja['ui.share']}
                            </Button>
                            {shareUrl && (
                                <div
                                    ref={sharePopoverRef}
                                    className="absolute right-0 top-full mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-50"
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
                            {ja['ui.navigator']}
                        </Button>
                    </div>
                </header>

                {/* Stack Scroll Area + Navigator */}
                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-8 relative">
                        <div className="max-w-3xl mx-auto pb-20">
                            {children}
                        </div>
                    </div>
                    {showNavigator && <CardNavigator />}
                </div>
            </main>
        </div>
    );
};
