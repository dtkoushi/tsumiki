import React, { useState } from 'react';
import { StickyNote } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { BaseCard } from './common/BaseCard';
import type { CardComponentProps, CardDefinition } from '../../lib/registry/types';
import { registry } from '../../lib/registry/registry';

const NoteComponent: React.FC<CardComponentProps> = ({ card, actions }) => {
    const [mode, setMode] = useState<'edit' | 'preview'>('edit');
    const content = (card.inputs['content']?.value as string) ?? '';

    return (
        <BaseCard card={card} icon={<StickyNote size={16} />} color="border-yellow-300">
            <div className="flex gap-1 mb-2">
                <button
                    onClick={() => setMode('edit')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${mode === 'edit' ? 'bg-yellow-200 text-yellow-800 font-medium' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    編集
                </button>
                <button
                    onClick={() => setMode('preview')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${mode === 'preview' ? 'bg-yellow-200 text-yellow-800 font-medium' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    プレビュー
                </button>
            </div>

            {mode === 'edit' ? (
                <textarea
                    className="w-full min-h-[120px] border border-slate-200 rounded p-2 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-yellow-300"
                    value={content}
                    onChange={(e) => actions.updateInput(card.id, 'content', e.target.value)}
                    placeholder={'# 計算前提\n- 荷重条件: ...'}
                />
            ) : (
                <div
                    className="min-h-[80px] text-sm text-slate-700 [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-1 [&_li]:mb-0.5 [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:rounded [&_code]:font-mono [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-2 [&_blockquote]:text-slate-500 [&_blockquote]:italic [&_strong]:font-semibold [&_hr]:border-slate-200 [&_hr]:my-2"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(content, { async: false })) }}
                />
            )}
        </BaseCard>
    );
};

const NoteDef: CardDefinition<Record<never, number>> = {
    type: 'NOTE',
    title: 'ノート',
    description: 'Markdown メモ',
    icon: StickyNote,
    defaultInputs: { content: { value: '' } },
    inputConfig: {},
    outputConfig: {} as Record<never, { label: string; unitType: string }>,
    calculate: () => ({}),
    component: NoteComponent,
    sidebar: { category: 'utility', order: 0 },
};

registry.register(NoteDef as unknown as CardDefinition<Record<string, number>>);
