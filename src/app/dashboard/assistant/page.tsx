'use client';

import { Header } from '@/components/Header';
import { GlassCard } from '@/components/GlassCard';
import { Send, User, Bot, Sparkles, AlertCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
};

export default function AssistantPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Hello! I am your AI Technologist Assistant. I can help you analyze competitor catalogs, find new manufacturers, or check feasibility of products.\n\nTry sending me a link like: "Analyze https://competitor.com/catalog/reactors"'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content }))
                })
            });

            if (!response.ok) {
                let errorMsg = 'Failed to send message';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error;
                    if (errorData.details) errorMsg += `: ${errorData.details}`;
                } catch (e) {
                    errorMsg = `Status ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMsg);
            }
            if (!response.body) throw new Error('No response body');

            // Stream handling
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: ''
            };

            setMessages(prev => [...prev, assistantMessage]);

            let accumulatedContent = '';
            let currentText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('Stream done');
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                console.log('Raw Chunk:', chunk);
                accumulatedContent += chunk;

                const lines = accumulatedContent.split('\n');
                accumulatedContent = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

                    const dataStr = trimmedLine.replace(/^data: /, '');
                    if (dataStr === '[DONE]') continue;

                    try {
                        const data = JSON.parse(dataStr);
                        console.log('Parsed SSE Data:', data);

                        // Handle text delta
                        if (data.type === 'text-delta' && typeof data.delta === 'string') {
                            currentText += data.delta;
                            console.log('Updating UI with total length:', currentText.length);

                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMsgIndex = newMessages.findIndex(m => m.id === assistantMessage.id);
                                if (lastMsgIndex !== -1) {
                                    newMessages[lastMsgIndex] = {
                                        ...newMessages[lastMsgIndex],
                                        content: currentText
                                    };
                                }
                                return newMessages;
                            });
                        }

                        // Handle tool result - format the data for display
                        if (data.type === 'tool-result') {
                            console.log('Tool result received:', data);
                            const result = data.result;
                            if (result && result.success) {
                                const formattedResult = `
**Analysis Complete** ✅

- **Products Found:** ${result.productsFound || 0}
- **Products Saved:** ${result.productsSaved || 0}
- **Products Analyzed:** ${result.productsAnalyzed || 0}
- **Average Score:** ${result.averageScore || 0}/100
- **High Potential (>70):** ${result.highPotentialCount || 0}

${result.topProducts && result.topProducts.length > 0 ? `**Top Products:**\n${result.topProducts.map((p: any) => `- ${p.name} (Score: ${p.score}, Machines: ${p.machines.join(', ')})`).join('\n')}` : ''}
`;
                                currentText += formattedResult;
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    const lastMsgIndex = newMessages.findIndex(m => m.id === assistantMessage.id);
                                    if (lastMsgIndex !== -1) {
                                        newMessages[lastMsgIndex] = {
                                            ...newMessages[lastMsgIndex],
                                            content: currentText
                                        };
                                    }
                                    return newMessages;
                                });
                            } else if (result && result.error) {
                                currentText += `\n**Error:** ${result.error}`;
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    const lastMsgIndex = newMessages.findIndex(m => m.id === assistantMessage.id);
                                    if (lastMsgIndex !== -1) {
                                        newMessages[lastMsgIndex] = {
                                            ...newMessages[lastMsgIndex],
                                            content: currentText
                                        };
                                    }
                                    return newMessages;
                                });
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to parse SSE JSON:', dataStr, e);
                    }
                }
            }

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen p-6 relative flex flex-col">
            <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col">
                <Header onScan={() => { }} isScanning={false} />

                <div className="flex-1 flex flex-col mt-4 h-[calc(100vh-140px)]">
                    <GlassCard className="flex-1 flex flex-col !p-0 overflow-hidden relative">
                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {messages.map(m => (
                                <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
                                        }`}>
                                        {m.role === 'user' ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                                    </div>
                                    <div className={`rounded-2xl p-4 max-w-[80%] ${m.role === 'user'
                                        ? 'bg-cyan-500/10 text-white border border-cyan-500/20'
                                        : 'bg-white/5 text-gray-200 border border-white/10'
                                        }`} data-content={m.content} data-role={m.role}>
                                        <div className="prose prose-invert max-w-none text-sm whitespace-pre-wrap leading-relaxed">
                                            {m.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 animate-pulse">
                                        <Bot className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-gray-400 text-sm flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 animate-spin" />
                                        Thinking & Analyzing...
                                    </div>
                                </div>
                            )}
                            {error && (
                                <div className="flex justify-center">
                                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                                        <AlertCircle className="w-4 h-4" />
                                        Error: {error.message}
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-black/20 border-t border-white/10">
                            <form onSubmit={handleSubmit} className="relative">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Paste a competitor URL... e.g. 'Analyze https://example.com/catalog'"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-4 text-white placeholder:text-white/30 focus:border-purple-500 focus:bg-white/10 outline-none transition"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input.trim()}
                                    className="absolute right-2 top-2 p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </main>
    );
}
