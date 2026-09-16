import React, { useState, useMemo, useEffect } from 'react';
import {
    OCCASIONS,
    STYLES,
    COLOR_TONES,
    FLOWER_CATALOG,
    ACCESSORIES_CATALOG
} from '../data/flowerData';
import {
    CustomBouquetConfiguration,
    OccasionType,
    StyleType,
    ColorToneType,
    OrderRecord,
    FlowerItem,
    FlowerAvailability
} from '../types';
import {
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Plus,
    Minus,
    Upload,
    Info,
    Sparkles,
    AlertCircle,
    Heart,
    Gift,
    Calendar,
    Clock,
    MapPin,
    FileText,
    Check,
    ShoppingBag,
    HelpCircle,
    Leaf,
    AlertTriangle,
    X,
    Calculator,
    Layers,
    ChevronDown,
    ChevronUp,
    SlidersHorizontal,
    Trash2,
    Share2,
    Wand2,
    Loader2,
    Link
} from 'lucide-react';
import { generateCardMessages } from '../lib/gemini';

interface CustomBouquetStudioProps {
    onOrderSubmitted: (order: OrderRecord) => void;
    onNavigateToStaff: () => void;
    initialConfig?: Partial<CustomBouquetConfiguration> | null;
}

const INITIAL_CONFIG: CustomBouquetConfiguration = {
    occasion: 'birthday',
    targetBudget: 800000,
    style: 'muse',
    colorTone: 'pastel',
    selectedFlowers: {
        'fl-ohara-pink': 5,
        'fl-baby-breath': 3,
        'fl-eucalyptus': 2,
    },
    selectedAccessories: ['acc-premium-paper', 'acc-calligraphy-card'],
    personalNote: '',
    referenceImageName: '',
    deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    deliveryTimeSlot: '14h - 17h (Buổi chiều)',
    recipientName: 'Thu Hà',
    recipientPhone: '0987654321',
    recipientAddress: 'Tòa nhà Vincom Center, 191 Bà Triệu, Hai Bà Trưng, Hà Nội',
    senderName: 'Hoàng Nam',
    senderPhone: '0912345678',
    cardMessage: 'Chúc em tuổi 24 luôn rạng rỡ, bình an và ngập tràn niềm vui như những đóa hoa này! Thương em nhiều.',
    paymentPreference: 'bank_transfer_deposit',
};

export const CustomBouquetStudio: React.FC<CustomBouquetStudioProps> = ({
    onOrderSubmitted,
    onNavigateToStaff,
    initialConfig,
}) => {
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [config, setConfig] = useState<CustomBouquetConfiguration>(() => ({
        ...INITIAL_CONFIG,
        ...(initialConfig || {}),
    }));

    useEffect(() => {
        if (initialConfig) {
            setConfig((prev) => ({
                ...prev,
                ...initialConfig,
                selectedFlowers: initialConfig.selectedFlowers || prev.selectedFlowers,
            }));
            setCurrentStep(5); // Jump directly to Flower & Stem selection step for easy customization
        }
    }, [initialConfig]);

    // Feature 2: Parse draft from URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const draftParam = urlParams.get('draft');
        if (draftParam) {
            try {
                const decoded = JSON.parse(atob(draftParam));
                setConfig((prev) => ({ ...prev, ...decoded }));
                setCurrentStep(7);
                // Clean URL to avoid confusing users
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) {
                console.error('Failed to parse draft URL', e);
            }
        }
    }, []);

    // Feature 1: AI States
    const [aiMessages, setAiMessages] = useState<string[]>([]);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [showAiSuggestions, setShowAiSuggestions] = useState(false);

    const handleGenerateAiMessage = async () => {
        setIsAiLoading(true);
        setShowAiSuggestions(true);
        try {
            const occasionLabel = OCCASIONS.find(o => o.id === config.occasion)?.label || 'Dịp đặc biệt';
            const styleLabel = STYLES.find(s => s.id === config.style)?.label || 'Tự do';

            const msgs = await generateCardMessages(
                occasionLabel,
                config.senderName,
                config.recipientName,
                styleLabel
            );
            setAiMessages(msgs);
        } catch (e) {
            console.error(e);
            setAiMessages(["Chúc bạn một ngày thật nhiều niềm vui và hạnh phúc!", "Mong bạn luôn rực rỡ như bó hoa này."]);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleShareDraft = () => {
        try {
            const encoded = btoa(JSON.stringify(config));
            const url = new URL(window.location.href);
            url.searchParams.set('draft', encoded);
            navigator.clipboard.writeText(url.toString());
            alert('Đã copy link bản nháp vào Clipboard! Bạn có thể gửi cho bạn bè ngay.');
        } catch (e) {
            alert('Không thể tạo link chia sẻ.');
        }
    };

    const [flowerFilterCategory, setFlowerFilterCategory] = useState<'all' | 'main' | 'secondary' | 'foliage'>('all');
    const [flowerAvailabilityFilter, setFlowerAvailabilityFilter] = useState<'all' | 'in_season' | 'limited' | 'out_of_stock'>('all');
    const [stockNoticeModalFlower, setStockNoticeModalFlower] = useState<FlowerItem | null>(null);
    const [submittedOrder, setSubmittedOrder] = useState<OrderRecord | null>(null);
    const [imageUploadSimulated, setImageUploadSimulated] = useState<boolean>(false);

    // Price Calculator interaction states
    const [showItemizedBreakdown, setShowItemizedBreakdown] = useState<boolean>(true);
    const [expandedSections, setExpandedSections] = useState<{
        base: boolean;
        additional: boolean;
        addons: boolean;
    }>({
        base: true,
        additional: true,
        addons: true,
    });
    const [isMobileBreakdownOpen, setIsMobileBreakdownOpen] = useState<boolean>(false);

    // Real-time seasonal inventory statistics for 66 Đại La
    const seasonalStats = useMemo(() => {
        const inSeason = FLOWER_CATALOG.filter((f) => f.availability === 'in_season').length;
        const limited = FLOWER_CATALOG.filter((f) => f.availability === 'limited').length;
        const outOfStock = FLOWER_CATALOG.filter((f) => f.availability === 'out_of_stock').length;
        return { inSeason, limited, outOfStock, total: FLOWER_CATALOG.length };
    }, []);

    // Check which limited flowers the customer has selected
    const selectedLimitedFlowers = useMemo(() => {
        return Object.entries(config.selectedFlowers)
            .map(([id, qty]) => {
                const fl = FLOWER_CATALOG.find((f) => f.id === id);
                return fl && fl.availability === 'limited' && (Number(qty) || 0) > 0
                    ? { flower: fl, qty: Number(qty) }
                    : null;
            })
            .filter(Boolean) as { flower: FlowerItem; qty: number }[];
    }, [config.selectedFlowers]);

    // Dynamic Price Breakdown calculation: Base flowers, Additional selections, and Add-ons
    const {
        baseFlowersCost,
        baseFlowersStems,
        baseFlowersItems,
        additionalFloralCost,
        additionalFloralStems,
        additionalFloralItems,
        basicCraftingFee,
        additionalSelectionsCost,
        addOnsCost,
        addOnsItems,
        estimatedTotal,
        totalStemsCount,
        flowerCost,
        accessoryCost,
    } = useMemo(() => {
        let bCost = 0;
        let bStems = 0;
        const bItems: Array<{ flower: FlowerItem; quantity: number; subtotal: number }> = [];

        let addFloralCost = 0;
        let addFloralStems = 0;
        const addFloralItems: Array<{ flower: FlowerItem; quantity: number; subtotal: number }> = [];

        Object.entries(config.selectedFlowers).forEach(([fId, qty]) => {
            const quantity = Number(qty) || 0;
            const flower = FLOWER_CATALOG.find((f) => f.id === fId);
            if (flower && quantity > 0) {
                const itemSubtotal = flower.unitPrice * quantity;
                if (flower.category === 'main') {
                    bCost += itemSubtotal;
                    bStems += quantity;
                    bItems.push({ flower, quantity, subtotal: itemSubtotal });
                } else {
                    addFloralCost += itemSubtotal;
                    addFloralStems += quantity;
                    addFloralItems.push({ flower, quantity, subtotal: itemSubtotal });
                }
            }
        });

        // Base craftsmanship fee (wrapping technique, flower hydration base, water tube pack)
        const baseFee = 50000;
        // Additional selections include secondary flowers, foliage & basic crafting/wrapping technique
        const addSelectionsCost = addFloralCost + baseFee;

        let aCost = 0;
        const aItems: Array<{ accessory: (typeof ACCESSORIES_CATALOG)[0]; subtotal: number }> = [];
        config.selectedAccessories.forEach((accId) => {
            const acc = ACCESSORIES_CATALOG.find((a) => a.id === accId);
            if (acc) {
                aCost += acc.price;
                aItems.push({ accessory: acc, subtotal: acc.price });
            }
        });

        const total = bCost + addSelectionsCost + aCost;

        return {
            baseFlowersCost: bCost,
            baseFlowersStems: bStems,
            baseFlowersItems: bItems,
            additionalFloralCost: addFloralCost,
            additionalFloralStems: addFloralStems,
            additionalFloralItems: addFloralItems,
            basicCraftingFee: baseFee,
            additionalSelectionsCost: addSelectionsCost,
            addOnsCost: aCost,
            addOnsItems: aItems,
            estimatedTotal: total,
            totalStemsCount: bStems + addFloralStems,
            flowerCost: bCost + addFloralCost,
            accessoryCost: aCost,
        };
    }, [config.selectedFlowers, config.selectedAccessories]);

    // Budget difference
    const budgetDifference = estimatedTotal - config.targetBudget;

    const handleUpdateFlowerQty = (flowerId: string, delta: number) => {
        const flower = FLOWER_CATALOG.find((f) => f.id === flowerId);
        if (!flower) return;

        // Prevent selecting out of stock flower and show advisory modal
        if (delta > 0 && flower.availability === 'out_of_stock') {
            setStockNoticeModalFlower(flower);
            return;
        }

        setConfig((prev) => {
            const currentQty = prev.selectedFlowers[flowerId] || 0;
            // Cap at stockCount if limited
            if (delta > 0 && flower.availability === 'limited' && currentQty >= flower.stockCount) {
                setStockNoticeModalFlower(flower);
                return prev;
            }
            const nextQty = Math.max(0, currentQty + delta);
            const newFlowers = { ...prev.selectedFlowers };
            if (nextQty === 0) {
                delete newFlowers[flowerId];
            } else {
                newFlowers[flowerId] = nextQty;
            }
            return { ...prev, selectedFlowers: newFlowers };
        });
    };

    const handleToggleAccessory = (accId: string) => {
        setConfig((prev) => {
            const exists = prev.selectedAccessories.includes(accId);
            const newAccs = exists
                ? prev.selectedAccessories.filter((id) => id !== accId)
                : [...prev.selectedAccessories, accId];
            return { ...prev, selectedAccessories: newAccs };
        });
    };

    const handleSubmitOrder = (e: React.FormEvent) => {
        e.preventDefault();
        const newOrder: OrderRecord = {
            id: `LF-${Math.floor(1000 + Math.random() * 9000)}`,
            createdAt: new Date().toLocaleString('vi-VN'),
            config: { ...config },
            estimatedPrice: estimatedTotal,
            status: 'pending_confirmation',
            staffNotes: 'Đang chờ Florist tại 66 Đại La kiểm tra độ tươi và xác nhận tính khả thi.',
            floristAssigned: 'Minh Anh (Florist Trưởng)',
        };
        setSubmittedOrder(newOrder);
        onOrderSubmitted(newOrder);
    };

    const stepsList = [
        { num: 1, title: 'Dịp tặng', label: 'Ý nghĩa' },
        { num: 2, title: 'Ngân sách', label: 'Mức giá' },
        { num: 3, title: 'Phong cách', label: 'Form dáng' },
        { num: 4, title: 'Tone màu', label: 'Thị giác' },
        { num: 5, title: 'Chọn hoa', label: 'Cành hoa' },
        { num: 6, title: 'Phụ kiện', label: 'Add-ons' },
        { num: 7, title: 'Xem lại', label: 'Thiết kế' },
        { num: 8, title: 'Gửi đơn', label: 'Giao nhận' },
    ];

    if (submittedOrder) {
        return (
            <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
                <div className="bg-white rounded-2xl border border-[#EBE5DC] p-8 shadow-xs text-center">
                    <div className="w-16 h-16 bg-[#4A5D4E]/10 rounded-full flex items-center justify-center text-[#4A5D4E] mx-auto mb-4">
                        <CheckCircle2 className="w-9 h-9 stroke-[2]" />
                    </div>

                    <span className="inline-block px-3 py-1 bg-[#FAF8F5] text-[#7A7067] border border-[#E2DDD5] text-xs font-semibold rounded-full mb-3">
                        Mã Đơn Cấu Hình: <strong className="text-[#2C2825] font-mono text-sm">{submittedOrder.id}</strong>
                    </span>

                    <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-[#2C2825] mb-3">
                        Yêu Cầu Thiết Kế Đã Được Gửi Tới Tiệm!
                    </h2>

                    <p className="text-sm text-[#5C5349] max-w-lg mx-auto mb-6 leading-relaxed">
                        Cảm ơn bạn đã tự tay gửi gắm tâm tư cho bó hoa. Hệ thống của <strong>Little Forest (66 Đại La)</strong> đã tiếp nhận trọn vẹn bản cấu hình.
                    </p>

                    {/* Model Explanation Box */}
                    <div className="bg-[#FAF8F5] border border-[#EBE5DC] rounded-xl p-5 text-left mb-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-[#4A5D4E]/10 text-[#4A5D4E] rounded-lg mt-0.5">
                                <Info className="w-4 h-4" />
                            </div>
                            <div className="text-xs text-[#5C5349] space-y-1.5 leading-relaxed">
                                <div className="font-bold text-[#2C2825] text-sm">
                                    Cơ chế Self-Service + Human Confirmation đang kích hoạt:
                                </div>
                                <div>
                                    1. <strong>Giá tạm tính hiện tại:</strong> {submittedOrder.estimatedPrice.toLocaleString('vi-VN')}đ.
                                </div>
                                <div>
                                    2. <strong>Florist đang làm gì:</strong> Florist trực tiếp tại 66 Đại La sẽ kiểm tra hoa tươi trong kho lạnh, độ nở của hoa và tính khả thi cắm dáng.
                                </div>
                                <div>
                                    3. <strong>Thời gian phản hồi:</strong> Tiệm sẽ gửi tin nhắn SMS / Zalo hoặc gọi điện thoại cho bạn trong vòng <strong>15 - 30 phút</strong> để xác nhận và gửi ảnh hoa thực tế trước khi cắm.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                            onClick={onNavigateToStaff}
                            className="w-full sm:w-auto px-6 py-3 bg-[#4A5D4E] hover:bg-[#3D4D40] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            Xem Dashboard Nhân Viên (Mô Phỏng Duyệt Đơn)
                        </button>
                        <button
                            onClick={() => {
                                setSubmittedOrder(null);
                                setCurrentStep(1);
                            }}
                            className="w-full sm:w-auto px-6 py-3 bg-[#FAF8F5] hover:bg-[#EFECE6] text-[#2C2825] border border-[#E2DDD5] text-xs font-semibold rounded-xl transition-all"
                        >
                            Tạo Thêm Một Bó Hoa Khác
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Studio Header & Subtitle */}
            <div className="text-center max-w-3xl mx-auto mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4A5D4E]/10 text-[#4A5D4E] text-xs font-semibold rounded-full mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Core Feature: Custom Bouquet Studio</span>
                </div>
                <h1 className="font-serif-display text-3xl sm:text-4xl font-bold text-[#2C2825] mb-2 tracking-tight">
                    Tự Tay Thiết Kế Bó Hoa Độc Bản
                </h1>
                <p className="text-sm text-[#7A7067] leading-relaxed">
                    Từng bước cấu hình theo sở thích, ngân sách và cảm xúc riêng của bạn.
                    Website tính <strong>Giá Tạm Tính</strong> minh bạch trước khi gửi cho nghệ nhân cắm hoa tại 66 Đại La.
                </p>
            </div>

            {/* 8-Step Progress Indicator */}
            <div className="mb-8 bg-white border border-[#EBE5DC] rounded-2xl p-4 shadow-2xs overflow-x-auto">
                <div className="flex items-center justify-between min-w-[640px] px-2">
                    {stepsList.map((step, idx) => {
                        const isDone = currentStep > step.num;
                        const isCurrent = currentStep === step.num;
                        return (
                            <React.Fragment key={step.num}>
                                <button
                                    onClick={() => setCurrentStep(step.num)}
                                    className="flex flex-col items-center gap-1 group text-center focus:outline-none"
                                >
                                    <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isDone
                                                ? 'bg-[#4A5D4E] text-white'
                                                : isCurrent
                                                    ? 'bg-[#2C2825] text-white ring-4 ring-[#4A5D4E]/20'
                                                    : 'bg-[#F0ECE6] text-[#8C8276] group-hover:bg-[#E5DFD7]'
                                            }`}
                                    >
                                        {isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : step.num}
                                    </div>
                                    <span
                                        className={`text-[11px] font-semibold block whitespace-nowrap ${isCurrent ? 'text-[#2C2825]' : 'text-[#8C8276]'
                                            }`}
                                    >
                                        {step.title}
                                    </span>
                                </button>
                                {idx < stepsList.length - 1 && (
                                    <div
                                        className={`flex-1 h-[2px] mx-2 transition-all ${currentStep > step.num ? 'bg-[#4A5D4E]' : 'bg-[#EBE5DC]'
                                            }`}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Main Studio Area: Grid layout (Left: Controls, Right: Sticky Summary) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column (Step-by-step Interactive Form) */}
                <div className="lg:col-span-8 bg-white border border-[#EBE5DC] rounded-2xl p-6 sm:p-8 shadow-xs">

                    {/* STEP 1: CHỌN DỊP TẶNG */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#4A5D4E]">Bước 1 / 8</span>
                                <h2 className="font-serif-display text-2xl font-bold text-[#2C2825] mt-1">
                                    Bạn Muốn Gửi Bó Hoa Này Cho Dịp Gì?
                                </h2>
                                <p className="text-xs text-[#7A7067] mt-1">
                                    Mỗi dịp tặng mang một ngôn ngữ cảm xúc riêng để Florist định hình thần thái tổng thể của bó hoa.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {OCCASIONS.map((occ) => {
                                    const isSelected = config.occasion === occ.id;
                                    return (
                                        <button
                                            key={occ.id}
                                            type="button"
                                            onClick={() => setConfig({ ...config, occasion: occ.id })}
                                            className={`p-4 rounded-xl border text-left transition-all ${isSelected
                                                    ? 'border-[#4A5D4E] bg-[#4A5D4E]/5 ring-1 ring-[#4A5D4E]'
                                                    : 'border-[#EBE5DC] hover:border-[#D4CCBF] hover:bg-[#FAF8F5]'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="font-semibold text-sm text-[#2C2825]">{occ.label}</span>
                                                {isSelected && <Check className="w-4 h-4 text-[#4A5D4E]" />}
                                            </div>
                                            <p className="text-xs text-[#7A7067] leading-relaxed">{occ.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CHỌN NGÂN SÁCH MỤC TIÊU */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#4A5D4E]">Bước 2 / 8</span>
                                <h2 className="font-serif-display text-2xl font-bold text-[#2C2825] mt-1">
                                    Ngân Sách Dự Kiến Của Bạn Là Bao Nhiêu?
                                </h2>
                                <p className="text-xs text-[#7A7067] mt-1">
                                    Đây là mốc định hướng để hệ thống hỗ trợ bạn cân đối số cành hoa và phụ kiện, tránh phát sinh ngoài ý muốn.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[500000, 800000, 1000000, 1500000].map((budget) => {
                                    const isSelected = config.targetBudget === budget;
                                    return (
                                        <button
                                            key={budget}
                                            type="button"
                                            onClick={() => setConfig({ ...config, targetBudget: budget })}
                                            className={`py-3.5 px-4 rounded-xl border text-center font-bold text-sm transition-all ${isSelected
                                                    ? 'bg-[#2C2825] text-white border-[#2C2825]'
                                                    : 'bg-white border-[#EBE5DC] text-[#2C2825] hover:bg-[#FAF8F5]'
                                                }`}
                                        >
                                            {budget.toLocaleString('vi-VN')}đ
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Slider for custom budget */}
                            <div className="bg-[#FAF8F5] p-5 rounded-xl border border-[#EBE5DC] space-y-3">
                                <div className="flex items-center justify-between text-xs text-[#7A7067]">
                                    <span>Hoặc kéo chọn mức ngân sách riêng:</span>
                                    <span className="font-bold text-sm text-[#4A5D4E]">
                                        {config.targetBudget.toLocaleString('vi-VN')}đ
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={400000}
                                    max={2500000}
                                    step={50000}
                                    value={config.targetBudget}
                                    onChange={(e) => setConfig({ ...config, targetBudget: Number(e.target.value) })}
                                    className="w-full accent-[#4A5D4E] cursor-pointer"
                                />
                                <div className="flex justify-between text-[11px] text-[#A69C90]">
                                    <span>400.000đ (Bó xinh xắn)</span>
                                    <span>1.000.000đ (Tiêu chuẩn)</span>
                                    <span>2.500.000đ+ (Đại tiệc/Bó lớn)</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: CHỌN PHONG CÁCH */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#4A5D4E]">Bước 3 / 8</span>
                                <h2 className="font-serif-display text-2xl font-bold text-[#2C2825] mt-1">
                                    Chọn Phong Cách Bó Hoa (Aesthetic Style)
                                </h2>
                                <p className="text-xs text-[#7A7067] mt-1">
                                    Quyết định dáng bó, độ xòe, độ bay của cành lá và hơi thở nghệ thuật.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {STYLES.map((style) => {
                                    const isSelected = config.style === style.id;
                                    return (
                                        <button
                                            key={style.id}
                                            type="button"
                                            onClick={() => setConfig({ ...config, style: style.id })}
                                            className={`p-4 rounded-xl border text-left transition-all ${isSelected
                                                    ? 'border-[#4A5D4E] bg-[#4A5D4E]/5 ring-1 ring-[#4A5D4E]'
                                                    : 'border-[#EBE5DC] hover:border-[#D4CCBF] hover:bg-[#FAF8F5]'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="font-bold text-sm text-[#2C2825]">{style.label}</span>
                                                {isSelected && <Check className="w-4 h-4 text-[#4A5D4E]" />}
                                            </div>
                                            <p className="text-xs text-[#7A7067] leading-relaxed">{style.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 4: CHỌN TONE MÀU CHỦ ĐẠO */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#4A5D4E]">Bước 4 / 8</span>
                                <h2 className="font-serif-display text-2xl font-bold text-[#2C2825] mt-1">
                                    Chọn Tone Màu Sắc Chủ Đạo
                                </h2>
                                <p className="text-xs text-[#7A7067] mt-1">
                                    Đảm bảo tổng thể bó hoa ăn ý về thị giác và hợp gu người nhận.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {COLOR_TONES.map((tone) => {
                                    const isSelected = config.colorTone === tone.id;
                                    return (
                                        <button
                                            key={tone.id}
                                            type="button"
                                            onClick={() => setConfig({ ...config, colorTone: tone.id })}
                                            className={`p-3.5 rounded-xl border text-left flex items-center gap-3.5 transition-all ${isSelected
                                                    ? 'border-[#4A5D4E] bg-[#4A5D4E]/5 ring-1 ring-[#4A5D4E]'
                                                    : 'border-[#EBE5DC] hover:border-[#D4CCBF] hover:bg-[#FAF8F5]'
                                                }`}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-full border border-black/10 shrink-0 shadow-2xs"
                                                style={{ backgroundColor: tone.hex }}
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-sm text-[#2C2825]">{tone.label}</span>
                                                    {isSelected && <Check className="w-4 h-4 text-[#4A5D4E]" />}
                                                </div>
                                                <span className="text-xs text-[#7A7067]">{tone.desc}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 5: CHỌN LOẠI HOA VÀ SỐ LƯỢNG (With Real-Time Availability Indicator) */}
                    {currentStep === 5 && (
                        <div className="space-y-6">
                            {/* Header */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#4A5D4E]">Bước 5 / 8</span>
                                    <h2 className="font-serif-display text-2xl font-bold text-[#2C2825] mt-1">
                                        Chọn Loại Hoa & Số Lượng Cành
                                    </h2>
                                    <p className="text-xs text-[#7A7067] mt-0.5">
                                        Tự do thêm bớt cành hoa. Website cập nhật trực tiếp độ tươi mùa vụ và tự động tính <strong>Giá Tạm Tính</strong>.
                                    </p>
                                </div>

                                {/* Warehouse Real-time Live Badge */}
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5] border border-[#EBE5DC] rounded-xl text-xs text-[#5C5349] self-start lg:self-auto shadow-2xs">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="font-semibold text-[#2C2825]">Kho 66 Đại La:</span>
                                    <span className="text-[#7A7067]">Nhập mới 07:00 sáng nay</span>
                                </div>
                            </div>

                            {/* Real-time Seasonal Data & Availability KPI Bar */}
                            <div className="bg-white border border-[#EBE5DC] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0EBE3] pb-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-[#4A5D4E]" />
                                        <span className="font-bold text-[#2C2825]">
                                            Tình Trạng Mùa Vụ & Tồn Kho Thực Tế
                                        </span>
                                        <span className="text-[11px] text-[#8C8276] hidden sm:inline">
                                            (Dữ liệu thời gian thực giúp quản lý kỳ vọng khách hàng)
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-[#7A7067]">
                                        Tổng số {seasonalStats.total} loại hoa & lá tại xưởng
                                    </span>
                                </div>

                                {/* 3 Availability Status Overview Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setFlowerAvailabilityFilter(flowerAvailabilityFilter === 'in_season' ? 'all' : 'in_season')}
                                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${flowerAvailabilityFilter === 'in_season'
                                                ? 'bg-emerald-50/90 border-emerald-400 ring-1 ring-emerald-400'
                                                : 'bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50'
                                            }`}
                                    >
                                        <div>
                                            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                                                Đang Rộ Mùa (In Season)
                                            </span>
                                            <p className="text-[10px] text-emerald-700 mt-0.5">
                                                Nở chuẩn form, hương thơm tươi nhất
                                            </p>
                                        </div>
                                        <span className="font-serif-display font-bold text-xl text-emerald-900 ml-2">
                                            {seasonalStats.inSeason}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFlowerAvailabilityFilter(flowerAvailabilityFilter === 'limited' ? 'all' : 'limited')}
                                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${flowerAvailabilityFilter === 'limited'
                                                ? 'bg-amber-50/90 border-amber-400 ring-1 ring-amber-400'
                                                : 'bg-amber-50/40 border-amber-100 hover:bg-amber-50'
                                            }`}
                                    >
                                        <div>
                                            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                                                Số Lượng Có Hạn (Limited)
                                            </span>
                                            <p className="text-[10px] text-amber-700 mt-0.5">
                                                Đầu vụ/nhập khẩu, còn dưới 10 cành
                                            </p>
                                        </div>
                                        <span className="font-serif-display font-bold text-xl text-amber-900 ml-2">
                                            {seasonalStats.limited}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFlowerAvailabilityFilter(flowerAvailabilityFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
                                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${flowerAvailabilityFilter === 'out_of_stock'
                                                ? 'bg-stone-100 border-stone-400 ring-1 ring-stone-400'
                                                : 'bg-[#FAF8F5] border-[#EBE5DC] hover:bg-stone-100/60'
                                            }`}
                                    >
                                        <div>
                                            <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-stone-400 inline-block"></span>
                                                Tạm Hết / Trái Vụ (Out of Stock)
                                            </span>
                                            <p className="text-[10px] text-stone-500 mt-0.5">
                                                Minh bạch để khách không phải chờ đợi
                                            </p>
                                        </div>
                                        <span className="font-serif-display font-bold text-xl text-stone-800 ml-2">
                                            {seasonalStats.outOfStock}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Combined Filter Controls: Category & Availability */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF8F5] p-3 rounded-2xl border border-[#EBE5DC]">
                                {/* Category tabs */}
                                <div className="flex items-center gap-1 overflow-x-auto text-xs">
                                    <span className="text-[11px] font-bold text-[#8C8276] mr-1 hidden sm:inline">Loại:</span>
                                    {[
                                        { id: 'all', label: 'Tất cả phân loại' },
                                        { id: 'main', label: 'Hoa chính' },
                                        { id: 'secondary', label: 'Hoa phụ' },
                                        { id: 'foliage', label: 'Lá & cành đệm' },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setFlowerFilterCategory(tab.id as any)}
                                            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${flowerFilterCategory === tab.id
                                                    ? 'bg-[#2C2825] text-white shadow-2xs'
                                                    : 'bg-white text-[#6C635A] border border-[#E2DDD5] hover:bg-[#F3EFEA]'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Quick Availability status filter */}
                                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                                    <span className="text-[11px] font-bold text-[#8C8276] mr-1 hidden sm:inline">Trạng thái:</span>
                                    <button
                                        type="button"
                                        onClick={() => setFlowerAvailabilityFilter('all')}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${flowerAvailabilityFilter === 'all'
                                                ? 'bg-[#4A5D4E] text-white'
                                                : 'bg-white text-[#7A7067] border border-[#EBE5DC] hover:bg-[#F3EFEA]'
                                            }`}
                                    >
                                        Tất cả ({seasonalStats.total})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFlowerAvailabilityFilter('in_season')}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${flowerAvailabilityFilter === 'in_season'
                                                ? 'bg-emerald-700 text-white'
                                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                            }`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Rộ mùa ({seasonalStats.inSeason})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFlowerAvailabilityFilter('limited')}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${flowerAvailabilityFilter === 'limited'
                                                ? 'bg-amber-600 text-white'
                                                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                                            }`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        Có hạn ({seasonalStats.limited})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFlowerAvailabilityFilter('out_of_stock')}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${flowerAvailabilityFilter === 'out_of_stock'
                                                ? 'bg-stone-700 text-white'
                                                : 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200'
                                            }`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                                        Tạm hết ({seasonalStats.outOfStock})
                                    </button>
                                </div>
                            </div>

                            {/* Grid of flowers with comprehensive Availability Indicator */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {FLOWER_CATALOG.filter((f) => {
                                    const matchCategory = flowerFilterCategory === 'all' || f.category === flowerFilterCategory;
                                    const matchAvailability =
                                        flowerAvailabilityFilter === 'all' || f.availability === flowerAvailabilityFilter;
                                    return matchCategory && matchAvailability;
                                }).map((flower) => {
                                    const qty = config.selectedFlowers[flower.id] || 0;
                                    const isOutOfStock = flower.availability === 'out_of_stock';
                                    const isLimited = flower.availability === 'limited';
                                    const isMaxReached = isLimited && qty >= flower.stockCount;

                                    return (
                                        <div
                                            key={flower.id}
                                            className={`p-3.5 rounded-2xl border flex gap-3.5 transition-all relative ${isOutOfStock
                                                    ? 'border-stone-200 bg-stone-50/70'
                                                    : qty > 0
                                                        ? 'border-[#4A5D4E] bg-[#4A5D4E]/5 shadow-xs ring-1 ring-[#4A5D4E]'
                                                        : 'border-[#EBE5DC] bg-white hover:border-[#D4CCBF] hover:shadow-2xs'
                                                }`}
                                        >
                                            {/* Flower Image with Availability Badges */}
                                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 border border-[#EBE5DC] bg-[#FAF8F5]">
                                                <img
                                                    src={flower.image}
                                                    alt={flower.vietnameseName}
                                                    referrerPolicy="no-referrer"
                                                    className={`w-full h-full object-cover transition-transform duration-300 ${isOutOfStock ? 'grayscale-[40%] opacity-70' : 'hover:scale-105'
                                                        }`}
                                                />

                                                {/* Top Availability Badge */}
                                                {flower.availability === 'in_season' && (
                                                    <span className="absolute top-1.5 left-1.5 bg-emerald-700/90 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                                        <Leaf className="w-2.5 h-2.5" />
                                                        <span>In Season</span>
                                                    </span>
                                                )}

                                                {flower.availability === 'limited' && (
                                                    <span className="absolute top-1.5 left-1.5 bg-amber-600/95 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        <span>Limited</span>
                                                    </span>
                                                )}

                                                {flower.availability === 'out_of_stock' && (
                                                    <span className="absolute top-1.5 left-1.5 bg-stone-800/90 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                                        <AlertCircle className="w-2.5 h-2.5" />
                                                        <span>Hết hàng</span>
                                                    </span>
                                                )}

                                                {/* Origin Tag */}
                                                {flower.origin && (
                                                    <span className="absolute bottom-1.5 left-1.5 bg-black/65 backdrop-blur-xs text-white text-[8px] px-1.5 py-0.5 rounded font-medium">
                                                        {flower.origin}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Card Content & Availability Indicator Details */}
                                            <div className="flex-1 flex flex-col justify-between min-w-0">
                                                <div>
                                                    <div className="flex items-start justify-between gap-1">
                                                        <h4 className="font-bold text-sm text-[#2C2825] leading-tight truncate">
                                                            {flower.vietnameseName}
                                                        </h4>
                                                    </div>
                                                    <p className="text-[11px] text-[#8C8276] italic truncate">{flower.name}</p>

                                                    <span className="font-bold text-xs text-[#4A5D4E] block mt-0.5">
                                                        {flower.unitPrice.toLocaleString('vi-VN')}đ
                                                        <span className="text-[10px] font-normal text-[#8C8276]"> / cành</span>
                                                    </span>

                                                    {/* Seasonal Stock & Real-time Info Badge */}
                                                    <div className="mt-1.5 p-1.5 rounded-lg text-[10px] leading-tight bg-[#FAF8F5] border border-[#EBE5DC]/80 space-y-0.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className={`font-semibold flex items-center gap-1 ${flower.availability === 'in_season'
                                                                    ? 'text-emerald-700'
                                                                    : flower.availability === 'limited'
                                                                        ? 'text-amber-700'
                                                                        : 'text-stone-500'
                                                                }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${flower.availability === 'in_season'
                                                                        ? 'bg-emerald-500 animate-pulse'
                                                                        : flower.availability === 'limited'
                                                                            ? 'bg-amber-500'
                                                                            : 'bg-stone-400'
                                                                    }`} />
                                                                {flower.availability === 'in_season' && `Kho sẵn: ~${flower.stockCount} cành`}
                                                                {flower.availability === 'limited' && `Chỉ còn ${flower.stockCount} cành`}
                                                                {flower.availability === 'out_of_stock' && 'Tạm hết cành đạt chuẩn'}
                                                            </span>
                                                            <span className="text-[#8C8276] text-[9px]">{flower.seasonality}</span>
                                                        </div>

                                                        <p className="text-[10px] text-[#6C635A] line-clamp-1 italic">
                                                            {flower.seasonalNote}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Card Footer: Quantity Counter or Out-Of-Stock Advisory */}
                                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#EBE5DC]">
                                                    {/* Left helper label */}
                                                    {isOutOfStock ? (
                                                        <span className="text-[10px] font-medium text-stone-500">
                                                            Chờ đợt nhập mới
                                                        </span>
                                                    ) : isLimited ? (
                                                        <span className="text-[10px] font-medium text-amber-700">
                                                            {qty > 0 ? `Đã chọn: ${qty}/${flower.stockCount}` : `Tối đa ${flower.stockCount} cành`}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-[#7A7067]">
                                                            {qty > 0 ? `Đã chọn: ${qty} cành` : 'Chưa chọn'}
                                                        </span>
                                                    )}

                                                    {/* Right counter actions */}
                                                    {isOutOfStock ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setStockNoticeModalFlower(flower)}
                                                            className="px-2.5 py-1 text-[11px] font-semibold bg-[#FAF8F5] hover:bg-[#EFECE6] text-[#4A5D4E] rounded-lg border border-[#E2DDD5] flex items-center gap-1 transition-all"
                                                        >
                                                            <Info className="w-3 h-3 text-[#4A5D4E]" />
                                                            <span>Gợi ý thay thế</span>
                                                        </button>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateFlowerQty(flower.id, -1)}
                                                                disabled={qty === 0}
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${qty > 0
                                                                        ? 'bg-[#EFECE6] text-[#2C2825] hover:bg-[#DED7CE]'
                                                                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                                                    }`}
                                                                title="Giảm 1 cành"
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>

                                                            <span className="w-5 text-center font-bold text-xs text-[#2C2825]">
                                                                {qty}
                                                            </span>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateFlowerQty(flower.id, 1)}
                                                                disabled={isMaxReached}
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${isMaxReached
                                                                        ? 'bg-amber-200 text-amber-800 cursor-not-allowed'
                                                                        : 'bg-[#4A5D4E] text-white hover:bg-[#3D4D40]'
                                                                    }`}
                                                                title={isMaxReached ? `Đã đạt tối đa ${flower.stockCount} cành có sẵn` : 'Thêm 1 cành'}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Advisory note for Selected Limited Flowers */}
                            {selectedLimitedFlowers.length > 0 && (
                                <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
                                    <div className="w-6 h-6 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                                        <Clock className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <strong className="block font-semibold">
                                            Lưu ý giữ hoa số lượng có hạn (Limited Stock Guarantee):
                                        </strong>
                                        <p className="text-[#6C5E4E] leading-relaxed">
                                            Bó hoa của bạn có{' '}
                                            <span className="font-semibold text-amber-900">
                                                {selectedLimitedFlowers.map((item) => `${item.flower.vietnameseName} (${item.qty} cành)`).join(', ')}
                                            </span>
                                            . Để đảm bảo cành tươi đẹp nhất, Florist tại 66 Đại La sẽ lập tức giữ hoa ngay sau khi nhận được yêu cầu của bạn.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Customer Expectation Management & Freshness Commitment */}
                            <div className="p-4 bg-[#FAF8F5] border border-[#EBE5DC] rounded-2xl flex items-start gap-3 text-xs text-[#5C5349]">
                                <div className="w-7 h-7 rounded-xl bg-[#4A5D4E]/10 text-[#4A5D4E] flex items-center justify-center shrink-0 mt-0.5">
                                    <Leaf className="w-4 h-4" />
                                </div>
                                <div className="space-y-1">
                                    <strong className="text-[#2C2825] font-semibold block">
                                        Cam kết minh bạch mùa vụ hoa tươi của Little Forest:
                                    </strong>
                                    <p className="text-[#7A7067] leading-relaxed">
                                        Hoa tươi là nông sản nghệ thuật phụ thuộc vào độ nở và thời tiết từng ngày. Little Forest cam kết chỉ sử dụng cành hoa đạt độ nở lý tưởng nhất. Nếu loại hoa bạn chọn có sự biến động đột xuất về chất lượng, tiệm sẽ liên hệ trao đổi phương án thay thế tối ưu trước khi cắm.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 6: CHỌN PHỤ KIỆN ADD-ON (Section 8: Upselling & Add-ons) */}
                    {currentStep === 6 && (
                        <div className="space-y-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#4A5D4E]">Bước 6 / 8</span>
                                <h2 className="font-serif-display text-2xl font-bold text-[#2C2825] mt-1">
                                    Make It Extra Special — Phụ Kiện & Quà Kèm
                                </h2>
                                <p className="text-xs text-[#7A7067] mt-1">
                                    Thêm những chi tiết tinh tế để gửi trọn vẹn sự chu đáo đến người nhận. Bạn hoàn toàn có thể bỏ qua bước này nếu chỉ cần hoa tươi.
                                </p>
                            </div>

                            {/* Contextual Recommendation Banner based on Occasion */}
                            <div className="p-4 bg-[#FAF8F5] border border-[#EBE5DC] rounded-2xl flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-[#4A5D4E]/10 text-[#4A5D4E] flex items-center justify-center shrink-0 mt-0.5">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div className="text-xs space-y-0.5">
                                    <strong className="text-[#2C2825] font-semibold block">
                                        Gợi ý riêng cho dịp "{OCCASIONS.find((o) => o.id === config.occasion)?.label}":
                                    </strong>
                                    <p className="text-[#6C635A] leading-relaxed">
                                        {config.occasion === 'anniversary'
                                            ? 'Dịp kỷ niệm ngày yêu/ngày cưới nên chọn Thiệp Calligraphy viết tay riêng và Hộp socola Bỉ để nhân đôi sự ngọt ngào.'
                                            : config.occasion === 'graduation'
                                                ? 'Lễ tốt nghiệp nên chọn Nơ lụa thắt bồng xòe để bạn nổi bật khi chụp ảnh kỷ yếu, kèm thiệp lời chúc tương lai.'
                                                : config.occasion === 'birthday'
                                                    ? 'Dịp sinh nhật phù hợp nhất với Thiệp chúc mừng cao cấp và Bình thủy tinh khía để bạn ấy trưng bàn làm việc ngay.'
                                                    : 'Nghệ nhân khuyên dùng Giấy gói lụa chống thấm cao cấp để bảo vệ cánh hoa luôn căng bóng trong suốt chặng đường giao hàng.'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Feature 3: Smart Cross-selling Recommendations */}
                                <div>
                                    <h3 className="text-sm font-bold text-[#2C2825] mb-3 flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-[#D98880]" />
                                        Gợi ý hoàn hảo cho bó hoa của bạn
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {ACCESSORIES_CATALOG.filter(acc =>
                                            (config.colorTone === 'dark' && acc.id === 'acc-chocolate') ||
                                            (config.occasion === 'birthday' && acc.id === 'acc-premium-card') ||
                                            (config.colorTone === 'pastel' && acc.id === 'acc-silk-ribbon')
                                        ).length > 0 ? ACCESSORIES_CATALOG.filter(acc =>
                                            (config.colorTone === 'dark' && acc.id === 'acc-chocolate') ||
                                            (config.occasion === 'birthday' && acc.id === 'acc-premium-card') ||
                                            (config.colorTone === 'pastel' && acc.id === 'acc-silk-ribbon')
                                        ).map((acc) => {
                                            const isSelected = config.selectedAccessories.includes(acc.id);
                                            return (
                                                <button
                                                    key={acc.id}
                                                    type="button"
                                                    onClick={() => handleToggleAccessory(acc.id)}
                                                    className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected
                                                            ? 'border-[#D98880] bg-[#D98880]/5'
                                                            : 'border-[#EBE5DC] bg-[#FAF8F5] hover:border-[#D98880]/50'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                                        <div>
                                                            <span className="font-bold text-sm text-[#2C2825] block">{acc.name}</span>
                                                            <span className="text-xs font-semibold text-[#D98880]">
                                                                +{acc.price.toLocaleString('vi-VN')}đ
                                                            </span>
                                                        </div>
                                                        <div
                                                            className={`w-5 h-5 rounded-md flex items-center justify-center border text-xs transition-all ${isSelected
                                                                    ? 'bg-[#D98880] border-[#D98880] text-white'
                                                                    : 'border-[#D4CCBF] bg-white'
                                                                }`}
                                                        >
                                                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-[#7A7067] leading-relaxed">{acc.description}</p>
                                                    <span className="inline-block mt-2 text-[10px] bg-white border border-[#EBE5DC] px-2 py-0.5 rounded-md text-[#D98880] font-medium">✨ Phù hợp với tone {COLOR_TONES.find(t => t.id === config.colorTone)?.label}</span>
                                                </button>
                                            );
                                        }) : (
                                            ACCESSORIES_CATALOG.slice(0, 2).map((acc) => {
                                                const isSelected = config.selectedAccessories.includes(acc.id);
                                                return (
                                                    <button
                                                        key={acc.id}
                                                        type="button"
                                                        onClick={() => handleToggleAccessory(acc.id)}
                                                        className={`p-4 rounded-xl border text-left transition-all ${isSelected
                                                                ? 'border-[#4A5D4E] bg-[#4A5D4E]/5 ring-1 ring-[#4A5D4E]'
                                                                : 'border-[#EBE5DC] hover:border-[#D4CCBF] hover:bg-[#FAF8F5]'
                                                            }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                                            <div>
                                                                <span className="font-bold text-sm text-[#2C2825] block">{acc.name}</span>
                                                                <span className="text-xs font-semibold text-[#D98880]">
                                                                    +{acc.price.toLocaleString('vi-VN')}đ
                                                                </span>
                                                            </div>
                                                            <div
                                                                className={`w-5 h-5 rounded-md flex items-center justify-center border text-xs transition-all ${isSelected
                                                                        ? 'bg-[#4A5D4E] border-[#4A5D4E] text-white'
                                                                        : 'border-[#D4CCBF] bg-white'
                                                                    }`}
                                                            >
                                                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-[#7A7067] leading-relaxed">{acc.description}</p>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-[#2C2825] mb-3">Các phụ kiện khác</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {ACCESSORIES_CATALOG.filter(acc => {
                                            const isRecommended = (config.colorTone === 'dark' && acc.id === 'acc-chocolate') ||
                                                (config.occasion === 'birthday' && acc.id === 'acc-premium-card') ||
                                                (config.colorTone === 'pastel' && acc.id === 'acc-silk-ribbon');
                                            return !isRecommended;
                                        }).map((acc) => {
                                            const isSelected = config.selectedAccessories.includes(acc.id);
                                            return (
                                                <button
                                                    key={acc.id}
                                                    type="button"
                                                    onClick={() => handleToggleAccessory(acc.id)}
                                                    className={`p-4 rounded-xl border text-left transition-all ${isSelected
                                                            ? 'border-[#4A5D4E] bg-[#4A5D4E]/5 ring-1 ring-[#4A5D4E]'
                                                            : 'border-[#EBE5DC] hover:border-[#D4CCBF] hover:bg-[#FAF8F5]'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                                        <div>
                                                            <span className="font-bold text-sm text-[#2C2825] block">{acc.name}</span>
                                                            <span className="text-xs font-semibold text-[#D98880]">
                                                                +{acc.price.toLocaleString('vi-VN')}đ
                                                            </span>
                                                        </div>
                                                        <div
                                                            className={`w-5 h-5 rounded-md flex items-center justify-center border text-xs transition-all ${isSelected
                                                                    ? 'bg-[#4A5D4E] border-[#4A5D4E] text-white'
                                                                    : 'border-[#D4CCBF] bg-white'
                                                                }`}
                                                        >
                                                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-[#7A7067] leading-relaxed">{acc.description}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 7: XEM LẠI CẤU HÌNH & TẢI ẢNH THAM KHẢO */}
                    {currentStep === 7 && (
                        <div className="space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#4A5D4E]">Bước 7 / 8</span>
                                    <h2 className="font-serif-display text-2xl font-bold text-[#2C2825] mt-1">
                                        Xem Lại Bản Cấu Hình & Thêm Ghi Chú Riêng
                                    </h2>
                                    <p className="text-xs text-[#7A7067] mt-1">
                                        Bạn có thể đính kèm ảnh chụp màn hình từ Pinterest/Instagram để Florist thấu hiểu mong muốn.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleShareDraft}
                                    className="px-4 py-2 bg-white border border-[#EBE5DC] text-[#4A5D4E] rounded-xl text-xs font-bold hover:bg-[#FAF8F5] transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs"
                                    title="Tạo link chia sẻ thiết kế này"
                                >
                                    <Link className="w-3.5 h-3.5" />
                                    Chia sẻ Bản nháp
                                </button>
                            </div>

                            {/* Review card */}
                            <div className="bg-[#FAF8F5] border border-[#EBE5DC] rounded-xl p-5 space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <span className="text-[#8C8276] block">Dịp tặng:</span>
                                        <strong className="text-[#2C2825]">
                                            {OCCASIONS.find((o) => o.id === config.occasion)?.label}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-[#8C8276] block">Phong cách:</span>
                                        <strong className="text-[#2C2825]">
                                            {STYLES.find((s) => s.id === config.style)?.label}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-[#8C8276] block">Tone màu:</span>
                                        <strong className="text-[#2C2825]">
                                            {COLOR_TONES.find((c) => c.id === config.colorTone)?.label}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-[#8C8276] block">Tổng số cành:</span>
                                        <strong className="text-[#4A5D4E]">{totalStemsCount} cành hoa & lá</strong>
                                    </div>
                                </div>

                                {/* Selected flowers list */}
                                <div className="border-t border-[#EBE5DC] pt-3">
                                    <span className="text-xs font-bold text-[#2C2825] block mb-2">
                                        Các loại hoa đã chọn (Kèm tình trạng mùa vụ):
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(config.selectedFlowers).map(([fId, qty]) => {
                                            const fl = FLOWER_CATALOG.find((f) => f.id === fId);
                                            if (!fl) return null;
                                            return (
                                                <span
                                                    key={fId}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E2DDD5] rounded-xl text-xs shadow-2xs"
                                                >
                                                    <span className="font-medium text-[#2C2825]">{fl.vietnameseName}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${fl.availability === 'in_season'
                                                            ? 'bg-emerald-50 text-emerald-800'
                                                            : fl.availability === 'limited'
                                                                ? 'bg-amber-50 text-amber-800'
                                                                : 'bg-stone-100 text-stone-600'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${fl.availability === 'in_season'
                                                                ? 'bg-emerald-500'
                                                                : fl.availability === 'limited'
                                                                    ? 'bg-amber-500'
                                                                    : 'bg-stone-400'
                                                            }`} />
                                                        {fl.availability === 'in_season' ? 'Rộ mùa' : fl.availability === 'limited' ? 'Có hạn' : 'Trái vụ'}
                                                    </span>
                                                    <strong className="text-[#4A5D4E] ml-0.5">×{qty} cành</strong>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Dynamic Price Breakdown in Review Card */}
                                <div className="border-t border-[#EBE5DC] pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-[#2C2825] flex items-center gap-1.5">
                                            <Calculator className="w-3.5 h-3.5 text-[#4A5D4E]" />
                                            <span>Chi tiết Giá Tạm Tính (Estimated Total):</span>
                                        </span>
                                        <span className="text-[11px] text-[#4A5D4E] font-bold">
                                            {estimatedTotal.toLocaleString('vi-VN')}đ
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                        <div className="p-2.5 bg-white rounded-xl border border-[#E2DDD5] space-y-0.5">
                                            <div className="text-[10px] text-[#8C8276] uppercase font-bold">1. Hoa chính (Base)</div>
                                            <div className="font-bold text-[#2C2825]">{baseFlowersCost.toLocaleString('vi-VN')}đ</div>
                                            <div className="text-[10px] text-[#7A7067]">{baseFlowersStems} cành hoa chính</div>
                                        </div>
                                        <div className="p-2.5 bg-white rounded-xl border border-[#E2DDD5] space-y-0.5">
                                            <div className="text-[10px] text-[#8C8276] uppercase font-bold">2. Bổ sung (Additional)</div>
                                            <div className="font-bold text-[#2C2825]">{additionalSelectionsCost.toLocaleString('vi-VN')}đ</div>
                                            <div className="text-[10px] text-[#7A7067]">{additionalFloralStems} cành phụ/lá + kỹ thuật gói</div>
                                        </div>
                                        <div className="p-2.5 bg-white rounded-xl border border-[#E2DDD5] space-y-0.5">
                                            <div className="text-[10px] text-[#8C8276] uppercase font-bold">3. Phụ kiện (Add-ons)</div>
                                            <div className="font-bold text-[#2C2825]">{addOnsCost.toLocaleString('vi-VN')}đ</div>
                                            <div className="text-[10px] text-[#7A7067]">{addOnsItems.length} món quà/phụ kiện</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Personal Note */}
                            <div>
                                <label className="block text-xs font-bold text-[#2C2825] mb-1.5">
                                    Ghi chú riêng cho Florist (Không bắt buộc):
                                </label>
                                <textarea
                                    rows={3}
                                    value={config.personalNote}
                                    onChange={(e) => setConfig({ ...config, personalNote: e.target.value })}
                                    placeholder="Ví dụ: Bạn mình thích cắm dáng xòe tự nhiên, không thích bó tròn chật chội; nhờ shop chọn hoa hồng thơm nhé..."
                                    className="w-full text-xs p-3 border border-[#EBE5DC] rounded-xl focus:border-[#4A5D4E] focus:outline-none bg-white"
                                />
                            </div>

                            {/* Photo Upload Simulation */}
                            <div>
                                <label className="block text-xs font-bold text-[#2C2825] mb-1.5">
                                    Tải ảnh mẫu tham khảo (Pinterest / Instagram / Bó hoa bạn ưng ý):
                                </label>
                                <div
                                    onClick={() => setImageUploadSimulated(!imageUploadSimulated)}
                                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${imageUploadSimulated
                                            ? 'border-[#4A5D4E] bg-[#4A5D4E]/5 text-[#4A5D4E]'
                                            : 'border-[#D4CCBF] hover:border-[#4A5D4E] bg-[#FAF8F5]'
                                        }`}
                                >
                                    <Upload className="w-6 h-6 mx-auto mb-2 opacity-70" />
                                    {imageUploadSimulated ? (
                                        <div className="text-xs">
                                            <strong className="block text-[#4A5D4E]">Đã tải ảnh: sample_bouquet_korean_muse.jpg</strong>
                                            <span className="text-[11px] text-[#7A7067]">(Bấm để đổi ảnh khác)</span>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-[#7A7067]">
                                            <span className="font-semibold text-[#2C2825]">Bấm để tải ảnh tham khảo</span> hoặc kéo thả file vào đây (PNG, JPG tối đa 5MB)
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 8: ĐẶT HÀNG & THÔNG TIN GIAO NHẬN */}
                    {currentStep === 8 && (
                        <form onSubmit={handleSubmitOrder} className="space-y-6">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#4A5D4E]">Bước 8 / 8</span>
                                <h2 className="font-serif-display text-2xl font-bold text-[#2C2825] mt-1">
                                    Thông Tin Giao Nhận & Lời Chúc Thiệp
                                </h2>
                                <p className="text-xs text-[#7A7067] mt-1">
                                    Dữ liệu được chuẩn hóa giúp tiệm giao hoa đúng người, đúng thời điểm hẹn tại Hà Nội.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                {/* Người đặt */}
                                <div className="space-y-1.5">
                                    <label className="font-bold text-[#2C2825]">Họ tên người đặt (Bạn):</label>
                                    <input
                                        type="text"
                                        required
                                        value={config.senderName}
                                        onChange={(e) => setConfig({ ...config, senderName: e.target.value })}
                                        className="w-full p-2.5 border border-[#EBE5DC] rounded-xl focus:border-[#4A5D4E] focus:outline-none"
                                        placeholder="Nguyễn Hoàng Nam"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="font-bold text-[#2C2825]">Số điện thoại liên hệ:</label>
                                    <input
                                        type="tel"
                                        required
                                        value={config.senderPhone}
                                        onChange={(e) => setConfig({ ...config, senderPhone: e.target.value })}
                                        className="w-full p-2.5 border border-[#EBE5DC] rounded-xl focus:border-[#4A5D4E] focus:outline-none"
                                        placeholder="0912 345 678"
                                    />
                                </div>

                                {/* Người nhận */}
                                <div className="space-y-1.5">
                                    <label className="font-bold text-[#2C2825]">Họ tên người nhận hoa:</label>
                                    <input
                                        type="text"
                                        required
                                        value={config.recipientName}
                                        onChange={(e) => setConfig({ ...config, recipientName: e.target.value })}
                                        className="w-full p-2.5 border border-[#EBE5DC] rounded-xl focus:border-[#4A5D4E] focus:outline-none"
                                        placeholder="Trần Thu Hà"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="font-bold text-[#2C2825]">Số điện thoại người nhận:</label>
                                    <input
                                        type="tel"
                                        required
                                        value={config.recipientPhone}
                                        onChange={(e) => setConfig({ ...config, recipientPhone: e.target.value })}
                                        className="w-full p-2.5 border border-[#EBE5DC] rounded-xl focus:border-[#4A5D4E] focus:outline-none"
                                        placeholder="0987 654 321"
                                    />
                                </div>
                            </div>

                            {/* Địa chỉ nhận hoa tại Hà Nội */}
                            <div className="space-y-1.5 text-xs">
                                <label className="font-bold text-[#2C2825] flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-[#D98880]" />
                                    <span>Địa chỉ giao hoa chi tiết (Nội thành Hà Nội):</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={config.recipientAddress}
                                    onChange={(e) => setConfig({ ...config, recipientAddress: e.target.value })}
                                    className="w-full p-2.5 border border-[#EBE5DC] rounded-xl focus:border-[#4A5D4E] focus:outline-none"
                                    placeholder="Số nhà, ngõ, tên đường, tên tòa nhà hoặc trường đại học..."
                                />
                            </div>

                            {/* Ngày & Giờ giao */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1.5">
                                    <label className="font-bold text-[#2C2825] flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-[#4A5D4E]" />
                                        <span>Ngày nhận hoa:</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={config.deliveryDate}
                                        onChange={(e) => setConfig({ ...config, deliveryDate: e.target.value })}
                                        className="w-full p-2.5 border border-[#EBE5DC] rounded-xl focus:border-[#4A5D4E] focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-bold text-[#2C2825] flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-[#4A5D4E]" />
                                        <span>Khung giờ giao mong muốn:</span>
                                    </label>
                                    <select
                                        value={config.deliveryTimeSlot}
                                        onChange={(e) => setConfig({ ...config, deliveryTimeSlot: e.target.value })}
                                        className="w-full p-2.5 border border-[#EBE5DC] rounded-xl focus:border-[#4A5D4E] focus:outline-none bg-white"
                                    >
                                        <option>08h - 11h (Buổi sáng)</option>
                                        <option>11h - 14h (Buổi trưa)</option>
                                        <option>14h - 17h (Buổi chiều)</option>
                                        <option>17h - 20h (Buổi tối lãng mạn)</option>
                                        <option>Giao giờ vàng chính xác (+50k phụ thu)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Nội dung thiệp chúc mừng */}
                            <div className="space-y-1.5 text-xs">
                                <label className="font-bold text-[#2C2825] flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5 text-[#D98880]" />
                                        <span>Nội dung in/viết tay trên thiệp:</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleGenerateAiMessage}
                                        disabled={isAiLoading}
                                        className="text-[11px] bg-gradient-to-r from-[#D98880]/10 to-[#F5B041]/10 text-[#2C2825] border border-[#D98880]/30 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-[#D98880]/20 transition-all"
                                    >
                                        {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin text-[#D98880]" /> : <Wand2 className="w-3 h-3 text-[#D98880]" />}
                                        {isAiLoading ? 'AI đang viết...' : 'Nhờ AI gợi ý lời chúc'}
                                    </button>
                                </label>

                                {showAiSuggestions && aiMessages.length > 0 && (
                                    <div className="bg-[#FAF8F5] border border-[#EBE5DC] rounded-xl p-3 mb-2 space-y-2">
                                        <div className="flex items-center justify-between text-[11px] text-[#8C8276]">
                                            <span className="font-semibold text-[#4A5D4E]">Gợi ý từ AI:</span>
                                            <button type="button" onClick={() => setShowAiSuggestions(false)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                                        </div>
                                        <div className="space-y-1.5">
                                            {aiMessages.map((msg, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        setConfig({ ...config, cardMessage: msg });
                                                        setShowAiSuggestions(false);
                                                    }}
                                                    className="p-2 bg-white border border-[#E2DDD5] rounded-lg text-xs italic font-serif text-[#5C5349] cursor-pointer hover:border-[#D98880] hover:bg-[#D98880]/5 transition-all"
                                                >
                                                    "{msg}"
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <textarea
                                    rows={3}
                                    value={config.cardMessage}
                                    onChange={(e) => setConfig({ ...config, cardMessage: e.target.value })}
                                    className="w-full p-3 border border-[#EBE5DC] rounded-xl focus:border-[#4A5D4E] focus:outline-none font-serif italic text-sm text-[#2C2825]"
                                    placeholder="Gửi gắm những lời yêu thương chân thành..."
                                />
                            </div>

                            {/* Hình thức thanh toán */}
                            <div className="space-y-1.5 text-xs">
                                <label className="font-bold text-[#2C2825]">Phương thức đặt cọc / Thanh toán:</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {[
                                        { id: 'bank_transfer_deposit', label: 'Chuyển khoản cọc 50%', sub: 'Phổ biến nhất' },
                                        { id: 'full_prepay', label: 'Thanh toán 100%', sub: 'Tặng hoa giấu tên' },
                                        { id: 'cod_deposit', label: 'Cọc 100k + COD', sub: 'Thanh toán khi nhận' },
                                    ].map((pay) => (
                                        <label
                                            key={pay.id}
                                            className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${config.paymentPreference === pay.id
                                                    ? 'border-[#4A5D4E] bg-[#4A5D4E]/5 ring-1 ring-[#4A5D4E]'
                                                    : 'border-[#EBE5DC] hover:bg-[#FAF8F5]'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="paymentPreference"
                                                checked={config.paymentPreference === pay.id}
                                                onChange={() =>
                                                    setConfig({
                                                        ...config,
                                                        paymentPreference: pay.id as any,
                                                    })
                                                }
                                                className="accent-[#4A5D4E]"
                                            />
                                            <div>
                                                <span className="font-bold text-xs text-[#2C2825] block leading-tight">{pay.label}</span>
                                                <span className="text-[10px] text-[#7A7067]">{pay.sub}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Submit CTA */}
                            <div className="pt-4 border-t border-[#EBE5DC]">
                                <button
                                    type="submit"
                                    className="w-full py-4 bg-[#4A5D4E] hover:bg-[#3D4D40] text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Gửi Cấu Hình Bó Hoa Đến Little Forest (Giá Tạm Tính: {estimatedTotal.toLocaleString('vi-VN')}đ)
                                </button>
                                <p className="text-[11px] text-center text-[#7A7067] mt-2">
                                    * Florist sẽ kiểm tra kho hoa tại 66 Đại La và liên hệ xác nhận trong 15-30 phút.
                                </p>
                            </div>
                        </form>
                    )}

                    {/* Navigation Controls (Prev / Next Step) */}
                    <div className="flex items-center justify-between pt-6 mt-6 border-t border-[#EBE5DC]">
                        <button
                            type="button"
                            disabled={currentStep === 1}
                            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                            className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${currentStep > 1
                                    ? 'border-[#EBE5DC] text-[#2C2825] hover:bg-[#FAF8F5]'
                                    : 'opacity-40 cursor-not-allowed border-[#EBE5DC] text-[#A69C90]'
                                }`}
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Quay lại bước trước
                        </button>

                        {currentStep < 8 && (
                            <button
                                type="button"
                                onClick={() => setCurrentStep((prev) => Math.min(8, prev + 1))}
                                className="px-5 py-2.5 bg-[#2C2825] hover:bg-[#4A5D4E] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                            >
                                Tiếp tục sang {stepsList[currentStep]?.title}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Column: Sticky Dynamic Price Calculator & Configuration Preview */}
                <div className="lg:col-span-4 sticky top-24 self-start max-h-[calc(100vh-6.5rem)] overflow-y-auto pr-1 space-y-4">
                    <div className="bg-white border border-[#EBE5DC] rounded-2xl p-5 shadow-xs space-y-4">
                        {/* Card Top Title & Live Status */}
                        <div className="flex items-center justify-between pb-3 border-b border-[#EBE5DC]">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-[#4A5D4E]/10 text-[#4A5D4E] flex items-center justify-center">
                                    <Calculator className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-serif-display font-bold text-base text-[#2C2825]">
                                        Bảng Tính Giá Tạm Tính
                                    </h3>
                                    <span className="text-[10px] text-[#7A7067] block">Cập nhật động theo từng lựa chọn</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200/60 rounded-full text-[10px] font-semibold text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Trực Tiếp</span>
                            </div>
                        </div>

                        {/* Hero Estimated Total Display */}
                        <div className="bg-[#FAF8F5] border border-[#EBE5DC] rounded-xl p-4 space-y-2.5">
                            <div className="flex items-baseline justify-between">
                                <div>
                                    <span className="text-xs font-bold text-[#2C2825] block">Ước Tính Tổng Tiền</span>
                                    <span className="text-[10px] text-[#8C8276] italic">(Estimated Total)</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-serif-display text-2xl font-bold text-[#4A5D4E]">
                                        {estimatedTotal.toLocaleString('vi-VN')}đ
                                    </span>
                                </div>
                            </div>

                            {/* 3-component formula badges */}
                            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#EBE5DC] text-[10px]">
                                <div className="p-1.5 bg-white rounded-lg border border-[#E2DDD5] text-center">
                                    <span className="text-[#8C8276] block truncate">Hoa chính</span>
                                    <strong className="text-[#2C2825] font-semibold">
                                        {(baseFlowersCost / 1000).toFixed(0)}k
                                    </strong>
                                </div>
                                <div className="p-1.5 bg-white rounded-lg border border-[#E2DDD5] text-center">
                                    <span className="text-[#8C8276] block truncate">Bổ sung</span>
                                    <strong className="text-[#2C2825] font-semibold">
                                        {(additionalSelectionsCost / 1000).toFixed(0)}k
                                    </strong>
                                </div>
                                <div className="p-1.5 bg-white rounded-lg border border-[#E2DDD5] text-center">
                                    <span className="text-[#8C8276] block truncate">Add-ons</span>
                                    <strong className="text-[#2C2825] font-semibold">
                                        {(addOnsCost / 1000).toFixed(0)}k
                                    </strong>
                                </div>
                            </div>

                            {/* Toggle itemized detail button */}
                            <button
                                type="button"
                                onClick={() => setShowItemizedBreakdown(!showItemizedBreakdown)}
                                className="w-full mt-1 py-1.5 px-2.5 bg-white hover:bg-[#F2ECE1] border border-[#E2DDD5] rounded-lg text-[11px] font-medium text-[#4A5D4E] flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>{showItemizedBreakdown ? 'Thu gọn chi tiết từng cành' : 'Mở rộng chi tiết từng cành'}</span>
                                {showItemizedBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                        </div>

                        {/* Detailed 3-part Breakdown Sections (Base flowers, Additional selections, Add-ons) */}
                        {showItemizedBreakdown && (
                            <div className="space-y-2.5 text-xs">
                                {/* 1. Base Flowers Section */}
                                <div className="border border-[#EBE5DC] rounded-xl overflow-hidden bg-white">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setExpandedSections((prev) => ({ ...prev, base: !prev.base }))
                                        }
                                        className="w-full p-2.5 bg-[#FAF8F5] hover:bg-[#F5F1EA] flex items-center justify-between text-left transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-[#4A5D4E]/10 text-[#4A5D4E] flex items-center justify-center text-[10px] font-bold">
                                                1
                                            </div>
                                            <div>
                                                <span className="font-bold text-[#2C2825] text-xs block">
                                                    Hoa chính nền tảng (Base Flowers)
                                                </span>
                                                <span className="text-[10px] text-[#7A7067]">
                                                    {baseFlowersStems} cành hoa chính
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-[#2C2825] text-xs">
                                                {baseFlowersCost.toLocaleString('vi-VN')}đ
                                            </span>
                                            {expandedSections.base ? (
                                                <ChevronUp className="w-3.5 h-3.5 text-[#8C8276]" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5 text-[#8C8276]" />
                                            )}
                                        </div>
                                    </button>

                                    {expandedSections.base && (
                                        <div className="p-2.5 space-y-2 border-t border-[#EBE5DC]">
                                            {baseFlowersItems.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {baseFlowersItems.map(({ flower, quantity, subtotal }) => (
                                                        <div
                                                            key={flower.id}
                                                            className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-[#FAF8F5] border border-[#EFECE6]"
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <img
                                                                    src={flower.image}
                                                                    alt={flower.vietnameseName}
                                                                    referrerPolicy="no-referrer"
                                                                    className="w-8 h-8 rounded-md object-cover border border-[#E2DDD5] shrink-0"
                                                                />
                                                                <div className="min-w-0">
                                                                    <div className="font-medium text-[#2C2825] truncate text-[11px]">
                                                                        {flower.vietnameseName}
                                                                    </div>
                                                                    <div className="text-[10px] text-[#8C8276]">
                                                                        {flower.unitPrice.toLocaleString('vi-VN')}đ/cành
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <div className="flex items-center border border-[#D4CCBF] rounded-md bg-white">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleUpdateFlowerQty(flower.id, -1)}
                                                                        className="p-1 hover:bg-[#FAF8F5] text-[#5C5349]"
                                                                        title="Giảm"
                                                                    >
                                                                        <Minus className="w-2.5 h-2.5" />
                                                                    </button>
                                                                    <span className="px-1.5 text-[11px] font-bold text-[#2C2825]">
                                                                        {quantity}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleUpdateFlowerQty(flower.id, 1)}
                                                                        className="p-1 hover:bg-[#FAF8F5] text-[#5C5349]"
                                                                        title="Tăng"
                                                                    >
                                                                        <Plus className="w-2.5 h-2.5" />
                                                                    </button>
                                                                </div>
                                                                <span className="font-semibold text-[#2C2825] text-[11px] w-14 text-right">
                                                                    {subtotal.toLocaleString('vi-VN')}đ
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-2 px-3 bg-[#FAF8F5] rounded-lg">
                                                    <span className="text-[11px] text-[#8C8276] block">
                                                        Chưa chọn cành hoa chính nào
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentStep(5)}
                                                        className="mt-1 text-[10px] font-bold text-[#4A5D4E] hover:underline inline-flex items-center gap-1"
                                                    >
                                                        <Plus className="w-3 h-3" /> Chọn hoa chính tại Bước 5
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 2. Additional Selections Section */}
                                <div className="border border-[#EBE5DC] rounded-xl overflow-hidden bg-white">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setExpandedSections((prev) => ({ ...prev, additional: !prev.additional }))
                                        }
                                        className="w-full p-2.5 bg-[#FAF8F5] hover:bg-[#F5F1EA] flex items-center justify-between text-left transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-[#4A5D4E]/10 text-[#4A5D4E] flex items-center justify-center text-[10px] font-bold">
                                                2
                                            </div>
                                            <div>
                                                <span className="font-bold text-[#2C2825] text-xs block">
                                                    Lựa chọn bổ sung (Additional Selections)
                                                </span>
                                                <span className="text-[10px] text-[#7A7067]">
                                                    {additionalFloralStems} cành phụ/lá + kỹ thuật gói
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-[#2C2825] text-xs">
                                                {additionalSelectionsCost.toLocaleString('vi-VN')}đ
                                            </span>
                                            {expandedSections.additional ? (
                                                <ChevronUp className="w-3.5 h-3.5 text-[#8C8276]" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5 text-[#8C8276]" />
                                            )}
                                        </div>
                                    </button>

                                    {expandedSections.additional && (
                                        <div className="p-2.5 space-y-2 border-t border-[#EBE5DC]">
                                            {additionalFloralItems.length > 0 && (
                                                <div className="space-y-1.5">
                                                    {additionalFloralItems.map(({ flower, quantity, subtotal }) => (
                                                        <div
                                                            key={flower.id}
                                                            className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-[#FAF8F5] border border-[#EFECE6]"
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <img
                                                                    src={flower.image}
                                                                    alt={flower.vietnameseName}
                                                                    referrerPolicy="no-referrer"
                                                                    className="w-8 h-8 rounded-md object-cover border border-[#E2DDD5] shrink-0"
                                                                />
                                                                <div className="min-w-0">
                                                                    <div className="font-medium text-[#2C2825] truncate text-[11px]">
                                                                        {flower.vietnameseName}
                                                                    </div>
                                                                    <div className="text-[10px] text-[#8C8276]">
                                                                        {flower.unitPrice.toLocaleString('vi-VN')}đ/cành
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <div className="flex items-center border border-[#D4CCBF] rounded-md bg-white">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleUpdateFlowerQty(flower.id, -1)}
                                                                        className="p-1 hover:bg-[#FAF8F5] text-[#5C5349]"
                                                                        title="Giảm"
                                                                    >
                                                                        <Minus className="w-2.5 h-2.5" />
                                                                    </button>
                                                                    <span className="px-1.5 text-[11px] font-bold text-[#2C2825]">
                                                                        {quantity}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleUpdateFlowerQty(flower.id, 1)}
                                                                        className="p-1 hover:bg-[#FAF8F5] text-[#5C5349]"
                                                                        title="Tăng"
                                                                    >
                                                                        <Plus className="w-2.5 h-2.5" />
                                                                    </button>
                                                                </div>
                                                                <span className="font-semibold text-[#2C2825] text-[11px] w-14 text-right">
                                                                    {subtotal.toLocaleString('vi-VN')}đ
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Base Crafting Fee & Wrapping Technique */}
                                            <div className="p-2 rounded-lg bg-white border border-[#E2DDD5] flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-md bg-[#4A5D4E]/10 text-[#4A5D4E] flex items-center justify-center">
                                                        <Leaf className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-[#2C2825] text-[11px] block">
                                                            Kỹ thuật gói & túi dưỡng nước gốc
                                                        </span>
                                                        <span className="text-[10px] text-[#8C8276]">
                                                            Bảo dưỡng độ tươi cành trong 24-48h
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="font-semibold text-[#2C2825] text-[11px]">
                                                    {basicCraftingFee.toLocaleString('vi-VN')}đ
                                                </span>
                                            </div>

                                            {additionalFloralItems.length === 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCurrentStep(5)}
                                                    className="w-full py-1 text-[10px] font-bold text-[#4A5D4E] hover:underline text-center flex items-center justify-center gap-1"
                                                >
                                                    <Plus className="w-3 h-3" /> Thêm hoa phụ/lá đệm tại Bước 5
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 3. Add-ons Section */}
                                <div className="border border-[#EBE5DC] rounded-xl overflow-hidden bg-white">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setExpandedSections((prev) => ({ ...prev, addons: !prev.addons }))
                                        }
                                        className="w-full p-2.5 bg-[#FAF8F5] hover:bg-[#F5F1EA] flex items-center justify-between text-left transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-[#4A5D4E]/10 text-[#4A5D4E] flex items-center justify-center text-[10px] font-bold">
                                                3
                                            </div>
                                            <div>
                                                <span className="font-bold text-[#2C2825] text-xs block">
                                                    Phụ kiện & Quà kèm (Add-ons)
                                                </span>
                                                <span className="text-[10px] text-[#7A7067]">
                                                    {addOnsItems.length} món đã chọn
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-[#2C2825] text-xs">
                                                {addOnsCost.toLocaleString('vi-VN')}đ
                                            </span>
                                            {expandedSections.addons ? (
                                                <ChevronUp className="w-3.5 h-3.5 text-[#8C8276]" />
                                            ) : (
                                                <ChevronDown className="w-3.5 h-3.5 text-[#8C8276]" />
                                            )}
                                        </div>
                                    </button>

                                    {expandedSections.addons && (
                                        <div className="p-2.5 space-y-2 border-t border-[#EBE5DC]">
                                            {addOnsItems.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {addOnsItems.map(({ accessory, subtotal }) => (
                                                        <div
                                                            key={accessory.id}
                                                            className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-[#FAF8F5] border border-[#EFECE6]"
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className="w-6 h-6 rounded-md bg-[#4A5D4E]/10 text-[#4A5D4E] flex items-center justify-center shrink-0">
                                                                    <Gift className="w-3 h-3" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <span className="font-medium text-[#2C2825] truncate text-[11px] block">
                                                                        {accessory.name}
                                                                    </span>
                                                                    <span className="text-[10px] text-[#8C8276]">
                                                                        {accessory.category}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="font-semibold text-[#2C2825] text-[11px]">
                                                                    {subtotal.toLocaleString('vi-VN')}đ
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleAccessory(accessory.id)}
                                                                    className="p-1 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded"
                                                                    title="Bỏ chọn"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-2 px-3 bg-[#FAF8F5] rounded-lg">
                                                    <span className="text-[11px] text-[#8C8276] block">
                                                        Chưa chọn phụ kiện hay quà kèm
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentStep(6)}
                                                        className="mt-1 text-[10px] font-bold text-[#4A5D4E] hover:underline inline-flex items-center gap-1"
                                                    >
                                                        <Plus className="w-3 h-3" /> Khám phá phụ kiện tại Bước 6
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Budget Meter Bar */}
                        <div className="pt-3 border-t border-[#EBE5DC] space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-[#8C8276]">Ngân sách mục tiêu:</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-[#2C2825]">
                                        {config.targetBudget.toLocaleString('vi-VN')}đ
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(2)}
                                        className="text-[10px] text-[#4A5D4E] underline hover:text-[#38483B]"
                                    >
                                        Đổi
                                    </button>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-2 bg-[#EFECE6] rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${budgetDifference <= 0 ? 'bg-[#4A5D4E]' : 'bg-amber-500'
                                        }`}
                                    style={{
                                        width: `${Math.min(100, (estimatedTotal / config.targetBudget) * 100)}%`,
                                    }}
                                />
                            </div>

                            <div className="text-[11px]">
                                {budgetDifference <= 0 ? (
                                    <span className="text-[#4A5D4E] flex items-center gap-1 font-medium">
                                        <Check className="w-3.5 h-3.5 shrink-0" />
                                        Đang nằm trong ngân sách (còn dư {Math.abs(budgetDifference).toLocaleString('vi-VN')}đ)
                                    </span>
                                ) : (
                                    <span className="text-amber-700 flex items-center gap-1 font-medium">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        Đang vượt {budgetDifference.toLocaleString('vi-VN')}đ (Florist sẽ cân đối dáng)
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Configuration Specs Snapshot */}
                        <div className="pt-3 border-t border-[#EBE5DC] space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-[#8C8276]">Dịp tặng:</span>
                                <span className="font-semibold text-[#2C2825]">
                                    {OCCASIONS.find((o) => o.id === config.occasion)?.label}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[#8C8276]">Phong cách:</span>
                                <span className="font-semibold text-[#2C2825]">
                                    {STYLES.find((s) => s.id === config.style)?.label}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[#8C8276]">Tone màu:</span>
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className="w-3 h-3 rounded-full border border-black/10"
                                        style={{
                                            backgroundColor: COLOR_TONES.find((c) => c.id === config.colorTone)?.hex,
                                        }}
                                    />
                                    <span className="font-semibold text-[#2C2825]">
                                        {COLOR_TONES.find((c) => c.id === config.colorTone)?.label}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[#8C8276]">Tổng số cành:</span>
                                <span className="font-bold text-[#4A5D4E]">{totalStemsCount} cành hoa & lá</span>
                            </div>
                        </div>

                        {/* Price Transparency Commitment Disclaimer */}
                        <div className="bg-[#F8F5EE] border border-[#E9DFCF] rounded-xl p-3 text-[11px] text-[#6C5E4E] leading-relaxed space-y-1">
                            <div className="font-bold flex items-center gap-1 text-[#4A5D4E]">
                                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Cam Kết Minh Bạch Về Giá:</span>
                            </div>
                            <p className="italic font-medium text-[#2C2825]">
                                "Giá cuối cùng sẽ được Little Forest xác nhận dựa trên tình trạng hoa thực tế và thiết kế hoàn thiện."
                            </p>
                            <p className="text-[10px] text-[#7A7067] pt-0.5">
                                Tiệm sẽ chụp ảnh hoa thật tại 66 Đại La gửi bạn duyệt trước khi giao, cam kết không phát sinh chi phí ẩn.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Bar for Mobile with Quick Price Breakdown & Drawer Trigger */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EBE5DC] p-2.5 px-4 shadow-xl">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-[#8C8276] truncate">
                                Bước {currentStep}/8: {stepsList[currentStep - 1]?.title}
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsMobileBreakdownOpen(true)}
                                className="text-[10px] font-bold text-[#4A5D4E] underline flex items-center gap-0.5"
                            >
                                <span>Bảng giá</span>
                                <ChevronUp className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xs text-[#534b42]">Tạm tính:</span>
                            <span className="font-serif-display font-bold text-base text-[#4A5D4E]">
                                {estimatedTotal.toLocaleString('vi-VN')}đ
                            </span>
                            <span className="text-[10px] text-[#8C8276] hidden sm:inline">
                                (Chính: {(baseFlowersCost / 1000).toFixed(0)}k • Bổ sung: {(additionalSelectionsCost / 1000).toFixed(0)}k • Add: {(addOnsCost / 1000).toFixed(0)}k)
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {currentStep > 1 && (
                            <button
                                type="button"
                                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                                className="p-2 rounded-xl border border-[#E2DDD5] bg-[#FAF8F5] text-[#2C2825]"
                                title="Quay lại"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        )}

                        {currentStep < 8 ? (
                            <button
                                type="button"
                                onClick={() => setCurrentStep((prev) => Math.min(8, prev + 1))}
                                className="px-3.5 py-2 bg-[#4A5D4E] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1"
                            >
                                <span>Tiếp Tục</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
                                    if (submitBtn) submitBtn.click();
                                }}
                                className="px-3.5 py-2 bg-[#4A5D4E] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1"
                            >
                                <span>Gửi Đơn</span>
                                <Check className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Price Calculator Drawer / Bottom Sheet */}
            {isMobileBreakdownOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 space-y-4 shadow-2xl border-t border-[#EBE5DC]">
                        <div className="flex items-center justify-between pb-3 border-b border-[#EBE5DC]">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-[#4A5D4E]/10 text-[#4A5D4E] flex items-center justify-center">
                                    <Calculator className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-serif-display font-bold text-base text-[#2C2825]">
                                        Bảng Tính Giá Tạm Tính Chi Tiết
                                    </h3>
                                    <span className="text-[10px] text-[#7A7067]">
                                        Minh bạch từng thành phần cành hoa & phụ kiện
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsMobileBreakdownOpen(false)}
                                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Hero Estimated Total */}
                        <div className="bg-[#FAF8F5] border border-[#EBE5DC] rounded-2xl p-4 text-center space-y-1">
                            <span className="text-xs text-[#7A7067] block">Tổng Giá Tạm Tính:</span>
                            <div className="font-serif-display text-3xl font-bold text-[#4A5D4E]">
                                {estimatedTotal.toLocaleString('vi-VN')}đ
                            </div>
                            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#5C5349] pt-1">
                                <span>Hoa chính: {baseFlowersCost.toLocaleString('vi-VN')}đ</span>
                                <span>•</span>
                                <span>Bổ sung: {additionalSelectionsCost.toLocaleString('vi-VN')}đ</span>
                                <span>•</span>
                                <span>Add-ons: {addOnsCost.toLocaleString('vi-VN')}đ</span>
                            </div>
                        </div>

                        {/* 3 Categories Breakdown List */}
                        <div className="space-y-3 text-xs">
                            {/* 1. Base Flowers */}
                            <div className="p-3 bg-white border border-[#EBE5DC] rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-md bg-[#4A5D4E]/10 text-[#4A5D4E] flex items-center justify-center text-[10px] font-bold">
                                            1
                                        </span>
                                        <strong className="text-[#2C2825]">Hoa chính nền tảng (Base Flowers):</strong>
                                    </div>
                                    <strong className="text-[#4A5D4E]">{baseFlowersCost.toLocaleString('vi-VN')}đ</strong>
                                </div>
                                {baseFlowersItems.length > 0 ? (
                                    <div className="space-y-1.5 pt-1">
                                        {baseFlowersItems.map(({ flower, quantity, subtotal }) => (
                                            <div key={flower.id} className="flex items-center justify-between p-1.5 bg-[#FAF8F5] rounded-lg">
                                                <span className="text-[11px] text-[#2C2825]">{flower.vietnameseName}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center border border-[#D4CCBF] rounded bg-white">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateFlowerQty(flower.id, -1)}
                                                            className="px-1.5 py-0.5 text-[#5C5349]"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="px-1 text-[11px] font-bold">{quantity}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateFlowerQty(flower.id, 1)}
                                                            className="px-1.5 py-0.5 text-[#5C5349]"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <span className="font-semibold text-[11px] text-[#2C2825] w-14 text-right">
                                                        {subtotal.toLocaleString('vi-VN')}đ
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-[#8C8276] italic">Chưa chọn hoa chính (0 cành)</div>
                                )}
                            </div>

                            {/* 2. Additional Selections */}
                            <div className="p-3 bg-white border border-[#EBE5DC] rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-md bg-[#4A5D4E]/10 text-[#4A5D4E] flex items-center justify-center text-[10px] font-bold">
                                            2
                                        </span>
                                        <strong className="text-[#2C2825]">Lựa chọn bổ sung (Additional Selections):</strong>
                                    </div>
                                    <strong className="text-[#4A5D4E]">{additionalSelectionsCost.toLocaleString('vi-VN')}đ</strong>
                                </div>
                                <div className="space-y-1.5 pt-1">
                                    {additionalFloralItems.map(({ flower, quantity, subtotal }) => (
                                        <div key={flower.id} className="flex items-center justify-between p-1.5 bg-[#FAF8F5] rounded-lg">
                                            <span className="text-[11px] text-[#2C2825]">{flower.vietnameseName}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center border border-[#D4CCBF] rounded bg-white">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateFlowerQty(flower.id, -1)}
                                                        className="px-1.5 py-0.5 text-[#5C5349]"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="px-1 text-[11px] font-bold">{quantity}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateFlowerQty(flower.id, 1)}
                                                        className="px-1.5 py-0.5 text-[#5C5349]"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <span className="font-semibold text-[11px] text-[#2C2825] w-14 text-right">
                                                    {subtotal.toLocaleString('vi-VN')}đ
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between p-1.5 bg-stone-50 rounded-lg text-[11px]">
                                        <span className="text-[#5C5349]">Kỹ thuật gói & túi dưỡng nước</span>
                                        <span className="font-semibold text-[#2C2825]">{basicCraftingFee.toLocaleString('vi-VN')}đ</span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Add-ons */}
                            <div className="p-3 bg-white border border-[#EBE5DC] rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-md bg-[#4A5D4E]/10 text-[#4A5D4E] flex items-center justify-center text-[10px] font-bold">
                                            3
                                        </span>
                                        <strong className="text-[#2C2825]">Phụ kiện & Quà kèm (Add-ons):</strong>
                                    </div>
                                    <strong className="text-[#4A5D4E]">{addOnsCost.toLocaleString('vi-VN')}đ</strong>
                                </div>
                                {addOnsItems.length > 0 ? (
                                    <div className="space-y-1.5 pt-1">
                                        {addOnsItems.map(({ accessory, subtotal }) => (
                                            <div key={accessory.id} className="flex items-center justify-between p-1.5 bg-[#FAF8F5] rounded-lg">
                                                <span className="text-[11px] text-[#2C2825]">{accessory.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-[11px] text-[#2C2825]">
                                                        {subtotal.toLocaleString('vi-VN')}đ
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleAccessory(accessory.id)}
                                                        className="text-stone-400 hover:text-rose-600 p-1"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-[#8C8276] italic">Chưa chọn phụ kiện nào (0đ)</div>
                                )}
                            </div>
                        </div>

                        {/* Budget Meter */}
                        <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EBE5DC] space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-[#7A7067]">Ngân sách mục tiêu:</span>
                                <span className="font-bold text-[#2C2825]">{config.targetBudget.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div className="w-full h-2 bg-[#EFECE6] rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${budgetDifference <= 0 ? 'bg-[#4A5D4E]' : 'bg-amber-500'
                                        }`}
                                    style={{
                                        width: `${Math.min(100, (estimatedTotal / config.targetBudget) * 100)}%`,
                                    }}
                                />
                            </div>
                            <div className="text-[11px] pt-0.5">
                                {budgetDifference <= 0 ? (
                                    <span className="text-[#4A5D4E] font-medium flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5" />
                                        Đang nằm trong ngân sách (còn dư {Math.abs(budgetDifference).toLocaleString('vi-VN')}đ)
                                    </span>
                                ) : (
                                    <span className="text-amber-700 font-medium flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        Đang vượt {budgetDifference.toLocaleString('vi-VN')}đ (Florist sẽ cân đối form cắm)
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={() => setIsMobileBreakdownOpen(false)}
                            className="w-full py-3 bg-[#2C2825] hover:bg-[#4A5D4E] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                        >
                            Đã hiểu, quay lại chỉnh sửa bó hoa
                        </button>
                    </div>
                </div>
            )}

            {/* Real-Time Stock & Seasonal Advisory Dialog Modal */}
            {stockNoticeModalFlower && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#EBE5DC]">
                        <div className="p-5 sm:p-6 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3.5">
                                    <img
                                        src={stockNoticeModalFlower.image}
                                        alt={stockNoticeModalFlower.vietnameseName}
                                        referrerPolicy="no-referrer"
                                        className="w-14 h-14 rounded-2xl object-cover border border-[#EBE5DC]"
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-serif-display font-bold text-lg text-[#2C2825]">
                                                {stockNoticeModalFlower.vietnameseName}
                                            </h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stockNoticeModalFlower.availability === 'out_of_stock'
                                                    ? 'bg-stone-100 text-stone-700'
                                                    : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                {stockNoticeModalFlower.availability === 'out_of_stock' ? 'Tạm hết / Trái vụ' : 'Đạt giới hạn kho'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#8C8276] italic">{stockNoticeModalFlower.name} • {stockNoticeModalFlower.origin}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setStockNoticeModalFlower(null)}
                                    className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Transparent explanation */}
                            <div className="p-3.5 bg-[#FAF8F5] border border-[#EBE5DC] rounded-2xl space-y-2 text-xs">
                                <div className="font-semibold text-[#2C2825] flex items-center gap-1.5">
                                    <Info className="w-4 h-4 text-[#4A5D4E]" />
                                    <span>Thông tin thực tế tại xưởng Little Forest (66 Đại La):</span>
                                </div>
                                <p className="text-[#6C635A] leading-relaxed">
                                    {stockNoticeModalFlower.seasonalNote}
                                </p>
                                <p className="text-[11px] text-[#7A7067]">
                                    Little Forest <strong>kiên quyết không dùng hoa ngâm thuốc hoặc hoa ủ lạnh lâu ngày</strong>. Nhờ vậy, mỗi bó hoa trao tay luôn giữ được hương thơm mộc mạc và độ bền tươi lâu nhất.
                                </p>
                            </div>

                            {/* Suggested seasonal alternatives */}
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-[#2C2825] block">
                                    Gợi ý hoa đang rộ mùa (In Season) thay thế lý tưởng:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {FLOWER_CATALOG.filter((f) => f.availability === 'in_season' && f.id !== stockNoticeModalFlower.id).slice(0, 4).map((alt) => (
                                        <button
                                            key={alt.id}
                                            type="button"
                                            onClick={() => {
                                                handleUpdateFlowerQty(alt.id, 2);
                                                setStockNoticeModalFlower(null);
                                            }}
                                            className="p-2.5 rounded-xl border border-[#EBE5DC] hover:border-[#4A5D4E] hover:bg-[#FAF8F5] text-left flex items-center gap-2.5 transition-all text-xs group"
                                        >
                                            <img
                                                src={alt.image}
                                                alt={alt.vietnameseName}
                                                referrerPolicy="no-referrer"
                                                className="w-10 h-10 rounded-lg object-cover border border-[#E2DDD5]"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <span className="font-bold text-[#2C2825] block truncate group-hover:text-[#4A5D4E]">
                                                    + Thêm {alt.vietnameseName}
                                                </span>
                                                <span className="text-[10px] text-emerald-700 font-medium block">
                                                    🟢 Đang rộ mùa • {alt.unitPrice.toLocaleString('vi-VN')}đ
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-2 border-t border-[#EBE5DC]">
                                <button
                                    type="button"
                                    onClick={() => setStockNoticeModalFlower(null)}
                                    className="px-4 py-2 bg-[#2C2825] hover:bg-[#4A5D4E] text-white rounded-xl text-xs font-semibold transition-colors"
                                >
                                    Đã hiểu, tiếp tục tùy chỉnh
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
