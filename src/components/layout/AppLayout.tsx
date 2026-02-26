import React, { useRef, useState } from 'react';
import {
    Layout,
    Plus,
    Download,
    Upload,
    Github,
    Share2,
    PanelRight,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import { useTsumikiStore } from '../../store/useTsumikiStore';
import type { CardType } from '../../types';
import { serializeProject, deserializeProject, compressToUrl } from '../../lib/utils/serialization';
import { toast } from '../common/toast';
import { Button } from '../common/Button';
import { CardNavigator } from '../stack/CardNavigator';
import { ja } from '../../lib/i18n/ja';

interface AppLayoutProps {
    children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const { meta, cards, pinnedOutputs, addCard, loadProject } = useTsumikiStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showNavigator, setShowNavigator] = useState(false);
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
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
        navigator.clipboard.writeText(url)
            .then(() => toast(ja['toast.linkCopied'], 'success'))
            .catch(() => toast(ja['toast.linkFailed'], 'error'));
    };


    interface CardItem { type: CardType; label: string; desc: string }
    interface CategoryDef { id: string; label: string; items: CardItem[] }

    const cardCategories: CategoryDef[] = [
        {
            id: 'geometry',
            label: ja['sidebar.category.geometry'],
            items: [
                { type: 'SECTION',  label: ja['card.section.title'],  desc: ja['card.section.description'] },
                { type: 'MATERIAL', label: ja['card.material.title'], desc: ja['card.material.description'] },
            ],
        },
        {
            id: 'loads',
            label: ja['sidebar.category.loads'],
            items: [
                { type: 'BEAM',       label: ja['card.beam.title'],      desc: ja['card.beam.description'] },
                { type: 'BEAM_MULTI', label: ja['card.beamMulti.title'], desc: ja['card.beamMulti.description'] },
                { type: 'COUPLE',     label: ja['card.couple.title'],    desc: ja['card.couple.description'] },
            ],
        },
        {
            id: 'analysis',
            label: ja['sidebar.category.analysis'],
            items: [
                { type: 'DIAGRAM',    label: ja['card.diagram.title'],    desc: ja['card.diagram.description'] },
                { type: 'STRESS',     label: ja['card.stress.title'],     desc: ja['card.stress.description'] },
                { type: 'DEFLECTION', label: ja['card.deflection.title'], desc: ja['card.deflection.description'] },
                { type: 'COLUMN',     label: ja['card.column.title'],     desc: ja['card.column.description'] },
            ],
        },
        {
            id: 'verify',
            label: ja['sidebar.category.verify'],
            items: [
                { type: 'VERIFY',         label: ja['card.verify.title'],         desc: ja['card.verify.description'] },
                { type: 'CUSTOM_MAP',     label: ja['card.custom.title.map'],     desc: ja['card.custom.description.map'] },
                { type: 'CUSTOM_COMBINE', label: ja['card.custom.title.combine'], desc: ja['card.custom.description.combine'] },
            ],
        },
    ];

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
                        <Button variant="primary" onClick={handleShare} leftIcon={<Share2 size={14} />}>
                            {ja['ui.share']}
                        </Button>
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
