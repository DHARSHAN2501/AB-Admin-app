import React, { useState, useEffect, useMemo } from 'react';
import { menuService } from '../services/adminService';
import { getCategoryImage, DEFAULT_CATEGORY_IMAGE } from '../constants/categories';
import { uploadRestaurantImage } from '../services/imageUploadService';
import { Modal } from '../components/Modal';
import { ModalUI } from '../components/ModalUI';
import { showToast } from '../components/Toast';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Image as ImageIcon, 
  Upload, 
  LayoutGrid, 
  ArrowLeft, 
  ChevronRight, 
  X, 
  FolderPlus,
  Database,
  RefreshCw
} from 'lucide-react';

export const MenuManagement = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  
  // When null, show the Categories showcase view.
  // When clicked, show dishes for that category only.
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  
  // Category Modal State (CRUD)
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catForm, setCatForm] = useState({
    name: '',
    badge: '',
    tagline: '',
    image_url: ''
  });

  // Dish Modal State
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [isOptimizingCatImage, setIsOptimizingCatImage] = useState(false);
  const [dishForm, setDishForm] = useState({ 
    name: '', 
    price: '', 
    category_id: '', 
    image_url: ''
  });

  const categoriesRef = React.useRef([]);
  categoriesRef.current = categories;

  const loadData = async ({ forceRefresh = false, categoriesChanged = true, itemsChanged = true } = {}) => {
    try {
      const [itms, cats] = await Promise.all([
        itemsChanged ? menuService.getMenuItems(forceRefresh) : Promise.resolve(null),
        categoriesChanged ? menuService.getCategories(forceRefresh) : Promise.resolve(null)
      ]);
      const nextCats = Array.isArray(cats) ? cats : categoriesRef.current;
      if (Array.isArray(cats)) {
        setCategories(nextCats);
      }
      if (Array.isArray(itms)) {
        const normalizedItems = itms.map(it => {
          const rawCat = String(it.category_name || it.category_id || '').trim();
          const matched = nextCats.find(
            c => c.id === rawCat || String(c.name || '').trim().toLowerCase() === rawCat.toLowerCase()
          );
          const resolvedCat = matched ? matched.name : rawCat;
          return {
            ...it,
            category_id: resolvedCat,
            category_name: resolvedCat
          };
        });
        setItems(normalizedItems);
      }
      setDbError(null);
    } catch (e) {
      console.warn('loadData error:', e);
      setDbError(e?.message || 'Unable to load menu categories from Supabase database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadData();
    const unsub = menuService.subscribeToMenu
      ? menuService.subscribeToMenu((scope) => loadData({
          forceRefresh: true,
          categoriesChanged: scope?.categoriesChanged ?? true,
          itemsChanged: scope?.itemsChanged ?? true
        }))
      : () => {};
    return () => unsub();
  }, []);

  // Compute item count per category dynamically
  const categoryCounts = useMemo(() => {
    const counts = {};
    if (!Array.isArray(items) || items.length === 0) return counts;
    items.forEach(item => {
      const cat = item.category_name || item.category_id;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [items]);

  // Client-side image compressor & downscaler for mobile camera photos
  // Resizes 3MB-12MB phone photos down to ~35KB-60KB JPEG to eliminate PostgreSQL statement timeouts
  const compressAndResizeImage = (input, maxWidth = 800, maxHeight = 800, quality = 0.75) => {
    return new Promise((resolve) => {
      if (!input) return resolve('');

      if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
        return resolve(input);
      }

      const processDataUrl = (dataUrl) => {
        if (typeof dataUrl === 'string' && dataUrl.length < 50000 && dataUrl.startsWith('data:image/jpeg')) {
          return resolve(dataUrl);
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onerror = () => resolve(dataUrl);
        img.onload = () => {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (!width || !height) return resolve(dataUrl);

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(dataUrl);

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const result = canvas.toDataURL('image/jpeg', quality);
            resolve(result);
          } catch (err) {
            console.warn('Canvas compression error:', err);
            resolve(dataUrl);
          }
        };
        img.src = dataUrl;
      };

      if (typeof input === 'string') {
        processDataUrl(input);
      } else if (input instanceof Blob || input instanceof File) {
        const reader = new FileReader();
        reader.onerror = () => resolve('');
        reader.onload = (e) => processDataUrl(e.target.result);
        reader.readAsDataURL(input);
      } else {
        resolve('');
      }
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setIsOptimizingImage(true);
      try {
        const uploadedUrl = await uploadRestaurantImage(file, 'dishes');
        if (uploadedUrl) {
          setDishForm(prev => ({ ...prev, image_url: uploadedUrl }));
          showToast({
            title: 'Photo Hosted',
            message: 'Image optimized and hosted for high-speed CDN delivery.',
            variant: 'success',
            duration: 2500
          });
        }
      } catch (err) {
        console.warn('Image optimization error:', err);
      } finally {
        setIsOptimizingImage(false);
      }
    }
  };

  const normalizeImageUrl = (urlStr) => {
    if (!urlStr || typeof urlStr !== 'string') return '';
    let trimmed = urlStr.trim();
    if (!trimmed) return '';

    try {
      if (trimmed.includes('google.') || trimmed.includes('bing.') || trimmed.includes('yahoo.') || trimmed.includes('imgres')) {
        const match = trimmed.match(/[?&](?:imgurl|mediaurl|url|src|img_url)=([^&]+)/i);
        if (match && match[1]) {
          const decoded = decodeURIComponent(match[1]);
          if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            trimmed = decoded;
          }
        }
      }
    } catch (e) {
      console.warn('Could not extract direct image URL:', e);
    }

    if (trimmed.startsWith('data:image') || trimmed.startsWith('/')) {
      return trimmed;
    }

    if (trimmed.length > 50 && !trimmed.includes(' ') && !trimmed.includes('.') && !trimmed.includes('/')) {
      return `data:image/png;base64,${trimmed}`;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      if (trimmed.includes('.') || trimmed.includes('/')) {
        trimmed = `https://${trimmed}`;
      }
    }

    return trimmed;
  };

  // Dish Handlers
  const handleOpenDishModal = (item = null) => {
    setEditingItem(item);
    const defaultCat = selectedCatId || (categories[0]?.name || '');
    if (item) {
      setDishForm({ 
        name: item.name, 
        price: item.price, 
        category_id: item.category_name || item.category_id || defaultCat, 
        image_url: item.image_url || ''
      });
    } else {
      setDishForm({ 
        name: '', 
        price: '', 
        category_id: defaultCat, 
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
      });
    }
    setIsDishModalOpen(true);
  };

  const handleDishSubmit = async (e) => {
    e.preventDefault();
    if (!dishForm.name || !dishForm.name.trim() || !dishForm.price) {
      showToast({
        title: 'Validation',
        message: 'Please enter both dish name and price.',
        variant: 'warning'
      });
      return;
    }

    let finalImageUrl = normalizeImageUrl(dishForm.image_url);
    if (finalImageUrl && (finalImageUrl.startsWith('data:image') || finalImageUrl.length > 50000)) {
      try {
        finalImageUrl = await uploadRestaurantImage(finalImageUrl, 'dishes');
      } catch (e) {
        console.warn('Image upload processing warning:', e);
      }
    }

    const isEditing = !!editingItem;
    const assignedId = isEditing ? editingItem.id : `item-${Date.now()}`;
    const payload = {
      id: assignedId,
      isEditing,
      ...dishForm,
      category_name: dishForm.category_id,
      image_url: finalImageUrl,
      price: Number(dishForm.price)
    };

    // Close modal immediately and update UI optimistically
    setIsDishModalOpen(false);
    setEditingItem(null);
    setItems(prev => {
      const idx = prev.findIndex(i => String(i.id) === String(assignedId));
      if (idx >= 0) {
        return prev.map(i => String(i.id) === String(assignedId) ? { ...i, ...payload } : i);
      }
      return [...prev, payload];
    });

    try {
      await menuService.saveMenuItem(payload);
      showToast({
        title: isEditing ? 'Updated' : 'Saved',
        message: isEditing
          ? `"${payload.name}" dish updated in database.`
          : `"${payload.name}" dish saved to database.`,
        variant: 'success'
      });
      await loadData();
    } catch (err) {
      console.error('saveMenuItem failed:', err);
      showToast({
        title: 'Database Error',
        message: err?.message || 'Failed to save dish changes. Please try again.',
        variant: 'danger'
      });
      await loadData();
    }
  };

  const handleDishDelete = (id, name) => {
    setModalConfig({
      isOpen: true,
      title: 'Delete Menu Item',
      message: `Are you sure you want to delete "${name}"?`,
      type: 'danger',
      confirmText: 'Yes, Delete Item',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        setItems(prev => prev.filter(i => String(i.id) !== String(id)));
        try {
          await menuService.deleteMenuItem(id);
          showToast({
            title: 'Deleted',
            message: `"${name}" dish deleted from database.`,
            variant: 'success'
          });
          await loadData();
        } catch (err) {
          console.error('deleteMenuItem failed:', err);
          showToast({
            title: 'Database Error',
            message: err?.message || 'Failed to delete dish. Please try again.',
            variant: 'danger'
          });
          await loadData();
        }
      },
      onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  // Category CRUD Handlers
  const handleOpenCatModal = (cat = null) => {
    setEditingCategory(cat);
    if (cat) {
      setCatForm({
        name: cat.name || '',
        badge: cat.badge || '',
        tagline: cat.tagline || cat.description || '',
        image_url: cat.image_url || ''
      });
    } else {
      setCatForm({
        name: '',
        badge: '',
        tagline: '',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
      });
    }
    setIsCatModalOpen(true);
  };

  const handleCatFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setIsOptimizingCatImage(true);
      try {
        const uploadedUrl = await uploadRestaurantImage(file, 'categories');
        if (uploadedUrl) {
          setCatForm(prev => ({ ...prev, image_url: uploadedUrl }));
          showToast({
            title: 'Category Image Hosted',
            message: 'Photo optimized and hosted for high-speed CDN delivery.',
            variant: 'success',
            duration: 2500
          });
        }
      } catch (err) {
        console.warn('Category image optimization error:', err);
      } finally {
        setIsOptimizingCatImage(false);
      }
    }
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    if (!catForm.name || !catForm.name.trim()) {
      showToast({
        title: 'Validation',
        message: 'Please enter a category name.',
        variant: 'warning'
      });
      return;
    }

    const trimmedName = catForm.name.trim();
    let finalImageUrl = normalizeImageUrl(catForm.image_url) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
    if (finalImageUrl && (finalImageUrl.startsWith('data:image') || finalImageUrl.length > 50000)) {
      try {
        finalImageUrl = await uploadRestaurantImage(finalImageUrl, 'categories');
      } catch (e) {
        console.warn('Category image upload processing warning:', e);
      }
    }
    const isEditing = !!editingCategory;
    const assignedId = isEditing ? (editingCategory.id || editingCategory.name) : `cat-${Date.now()}`;
    const nextOrder = isEditing
      ? Number(editingCategory.display_order ?? editingCategory.no ?? 0)
      : categories.reduce((mx, c) => Math.max(mx, Number(c.display_order ?? c.no ?? 0)), 0) + 1;

    const catPayload = {
      id: assignedId,
      isEditing,
      name: trimmedName,
      badge: catForm.badge ? catForm.badge.trim() : '',
      tagline: catForm.tagline ? catForm.tagline.trim() : '',
      image_url: finalImageUrl,
      display_order: nextOrder,
      is_active: true
    };

    const oldName = editingCategory ? editingCategory.name : null;

    // Close modal immediately and update local UI state optimistically
    setIsCatModalOpen(false);
    setEditingCategory(null);
    setCategories(prev => {
      const idx = prev.findIndex(c => String(c.id || c.name) === String(assignedId) || (oldName && c.name === oldName));
      const nextItem = { id: assignedId, name: trimmedName, badge: catPayload.badge, tagline: catPayload.tagline, image_url: finalImageUrl, display_order: nextOrder, is_active: true };
      if (idx >= 0) {
        return prev.map((c, i) => i === idx ? { ...c, ...nextItem } : c);
      }
      return [...prev, nextItem];
    });
    if (selectedCatId && oldName && selectedCatId === oldName) {
      setSelectedCatId(trimmedName);
    }

    try {
      await menuService.saveCategory(catPayload, oldName);
      showToast({
        title: isEditing ? 'Updated' : 'Saved',
        message: isEditing
          ? `Category "${trimmedName}" updated in database.`
          : `Category "${trimmedName}" saved to database.`,
        variant: 'success'
      });
      await loadData();
    } catch (err) {
      console.error('saveCategory failed:', err);
      showToast({
        title: 'Database Error',
        message: err?.message || 'Failed to save category to Supabase DB.',
        variant: 'danger'
      });
      await loadData();
    }
  };

  const handleCatDelete = (cat) => {
    if (!cat) return;
    setModalConfig({
      isOpen: true,
      title: 'Delete Category',
      message: `Are you sure you want to delete the "${cat.name}" category? Dishes in this category will remain preserved in the system.`,
      type: 'danger',
      confirmText: 'Yes, Delete Category',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        setCategories(prev => prev.filter(c => String(c.id || c.name) !== String(cat.id || cat.name)));
        if (selectedCatId === cat.name) {
          setSelectedCatId(null);
        }
        try {
          await menuService.deleteCategory(cat.id || cat.name);
          showToast({
            title: 'Deleted',
            message: `Category "${cat.name}" deleted from database.`,
            variant: 'success'
          });
          await loadData();
        } catch (err) {
          console.error('deleteCategory failed:', err);
          showToast({
            title: 'Database Error',
            message: err?.message || 'Failed to delete category from Supabase DB.',
            variant: 'danger'
          });
          await loadData();
        }
      },
      onClose: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleSelectCategory = (catName) => {
    setSelectedCatId(catName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToCategories = () => {
    setSelectedCatId(null);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredItems = useMemo(() => {
    if (!selectedCatId && !searchQuery.trim()) {
      return [];
    }
    return items.filter(it => {
      const itemCat = it.category_name || it.category_id;
      if (selectedCatId && itemCat !== selectedCatId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (it.name || '').toLowerCase().includes(q);
        const matchCat = (itemCat || '').toLowerCase().includes(q);
        return matchName || matchCat;
      }
      return true;
    });
  }, [items, selectedCatId, searchQuery]);

  const selectedCategoryMeta = useMemo(() => {
    if (!selectedCatId) return null;
    return categories.find(c => c.name === selectedCatId || c.id === selectedCatId) || null;
  }, [categories, selectedCatId]);

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      
      {/* Kitchen Brand Hero Banner for Menu Management */}
      <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-slate-200/90 bg-slate-900">
        <img 
          src="/kitchen-banner.jpg?v=3" 
          alt="Arunachala Bhavan Kitchen - Temple of Taste" 
          className="w-full h-auto max-h-[380px] object-cover block"
        />
      </div>

      {/* Action Toolbar: Search + Add Category + Add Food Item */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search food dishes by name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-xs"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => handleOpenCatModal()} 
            className="flex-1 sm:flex-initial bg-white hover:bg-slate-50 text-blue-700 px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-xs border border-blue-200/90 active:scale-98 transition shrink-0 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-blue-600" />
            <span>Add Category</span>
          </button>
          <button 
            type="button"
            onClick={() => handleOpenDishModal()} 
            className="flex-1 sm:flex-initial bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 border border-white/20 active:scale-98 transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add Food Item</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: MENU CATEGORIES SHOWCASE (Default State)
          No dishes shown in bottom; click a category to view and manage dishes
         ========================================================================= */}
      {!selectedCatId && !searchQuery.trim() && (
        <section className="space-y-4">
          {dbError && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-start gap-3">
                <Database className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-amber-950">Supabase Categories Table Setup Needed</h3>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {dbError}. Run <code className="bg-amber-100 px-1.5 py-0.5 rounded font-bold">supabase_categories_setup.sql</code> once in your Supabase SQL Editor so categories are stored permanently in PostgreSQL (zero localStorage).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => loadData({ forceRefresh: true })}
                className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry DB Sync
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-slate-200/80 animate-pulse flex items-center justify-between gap-3.5 sm:gap-4"
                >
                  <div className="flex items-center gap-3.5 sm:gap-4 flex-1">
                    <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-200/70 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4.5 w-36 rounded-md bg-slate-200/70" />
                      <div className="h-3 w-48 rounded bg-slate-100" />
                      <div className="h-2.5 w-24 rounded bg-slate-100/70" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-slate-100" />
                    <div className="h-8 w-8 rounded-xl bg-slate-100" />
                    <div className="h-8 w-8 rounded-xl bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : categories.length === 0 && !dbError ? (
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center max-w-md mx-auto my-6 space-y-3">
              <FolderPlus className="w-10 h-10 text-blue-600 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">No Categories in Database</h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Your Supabase <code className="bg-slate-100 px-1 rounded">categories</code> table is currently empty. Add your first category to start organizing dishes.
              </p>
              <button
                type="button"
                onClick={() => handleOpenCatModal()}
                className="bg-blue-700 hover:bg-blue-800 text-white font-black text-xs px-5 py-2.5 rounded-xl inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 sm:gap-3">
              {categories.map((cat) => {
                const count = categoryCounts[cat.name] || 0;
                return (
                  <div
                    key={cat.id || cat.name}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectCategory(cat.name)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectCategory(cat.name);
                      }
                    }}
                    className="w-full bg-white hover:bg-gradient-to-r hover:from-white hover:to-blue-50/40 p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-blue-300 transition-all duration-300 flex items-center justify-between gap-3.5 sm:gap-4 group cursor-pointer active:scale-[0.985] text-left"
                  >
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                      {/* Food Photography Thumbnail */}
                      <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs shrink-0 group-hover:shadow-md transition-shadow">
                        <img
                          src={getCategoryImage(cat)}
                          alt={cat.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = DEFAULT_CATEGORY_IMAGE;
                          }}
                        />
                      </div>

                      {/* Title, Badge, Tagline & Dish Count */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-base sm:text-lg text-slate-900 group-hover:text-blue-700 transition-colors tracking-tight leading-snug">
                            {cat.name}
                          </h3>
                          {cat.badge && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70 shrink-0">
                              {cat.badge}
                            </span>
                          )}
                        </div>

                        {cat.tagline && (
                          <p className="text-xs text-slate-500 font-medium line-clamp-1 leading-normal">
                            {cat.tagline}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                          <span>{count} {count === 1 ? 'dish' : 'dishes'} in database</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons on the right */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCatModal(cat);
                        }}
                        title={`Edit ${cat.name}`}
                        className="p-2 sm:p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-700 border border-slate-200/70 transition active:scale-90 cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCatDelete(cat);
                        }}
                        title={`Delete ${cat.name}`}
                        className="p-2 sm:p-2.5 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200/70 transition active:scale-90 cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-all duration-300 ml-1 shadow-2xs group-hover:shadow-md group-hover:translate-x-0.5">
                        <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          VIEW 2: CATEGORY DISHES MANAGEMENT VIEW (Shown when category is clicked)
          OR SEARCH RESULTS VIEW
         ========================================================================= */}
      {(selectedCatId || searchQuery.trim()) && (
        <section className="space-y-4">
          
          {/* Unified Category Management Header & Quick Switcher Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-3.5 sm:p-5 space-y-3.5">
            {/* Top Row: Back + Thumbnail + Title/Dish Count + Category & Dish Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleBackToCategories}
                  aria-label="Back to All Categories"
                  title="Back to All Categories"
                  className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {selectedCategoryMeta ? (
                  <img
                    src={getCategoryImage(selectedCategoryMeta)}
                    alt={selectedCategoryMeta.name}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl object-cover border border-slate-200/80 shadow-2xs shrink-0"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = DEFAULT_CATEGORY_IMAGE;
                    }}
                  />
                ) : (
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center shrink-0">
                    <Search className="w-5 h-5 text-blue-700" />
                  </div>
                )}

                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 block">
                    {searchQuery ? 'Search Results' : 'Menu Category'}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-xl font-black text-slate-900 leading-tight truncate">
                      {searchQuery ? `"${searchQuery}"` : (selectedCategoryMeta?.name || selectedCatId)}
                    </h2>
                    <span className="bg-blue-50 text-blue-700 border border-blue-200/70 text-[11px] font-black px-2.5 py-0.5 rounded-full shrink-0">
                      {filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Balanced Right-Side Action Controls */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {selectedCategoryMeta && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenCatModal(selectedCategoryMeta)}
                      className="w-9 h-9 rounded-xl text-slate-600 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200/80 flex items-center justify-center transition cursor-pointer"
                      title="Edit Category Name, Image or Badge"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCatDelete(selectedCategoryMeta)}
                      className="w-9 h-9 rounded-xl text-slate-600 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200/80 flex items-center justify-center transition cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button 
                  type="button"
                  onClick={() => handleOpenDishModal()} 
                  className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add to {selectedCatId || 'Menu'}
                </button>
              </div>
            </div>

            {/* Integrated Quick Category Switcher Pills */}
            <div className="pt-3 border-t border-slate-100 flex gap-2 overflow-x-auto scrollbar-none items-center">
              <button
                type="button"
                onClick={handleBackToCategories}
                className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center gap-1.5 transition shrink-0 cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> All
              </button>
              {categories.map(c => {
                const isCur = selectedCatId === c.name;
                return (
                  <button
                    type="button"
                    key={c.id || c.name}
                    onClick={() => handleSelectCategory(c.name)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors duration-200 inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isCur
                        ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-sm shadow-blue-500/20'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border border-slate-200/80 hover:border-blue-200'
                    }`}
                  >
                    <span>{c.name}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handleOpenCatModal()}
                className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 inline-flex items-center gap-1 transition shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Category
              </button>
            </div>
          </div>

          {/* Food Cards Grid */}
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
              {filteredItems.map(item => {
                return (
                  <div 
                    key={item.id}
                    onClick={() => handleOpenDishModal(item)}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 overflow-hidden flex flex-col justify-between group h-full relative cursor-pointer"
                  >
                    <div className="relative h-44 sm:h-40 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
                        }}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                      {/* Category Badge on image */}
                      {item.category_name && (
                        <span className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/20 shadow-xs">
                          {item.category_name}
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-black text-slate-900 text-base group-hover:text-blue-700 transition-colors leading-tight line-clamp-2">
                          {item.name}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Price</span>
                          <span className="text-base sm:text-lg font-black text-slate-900">${item.price}</span>
                        </div>
                      </div>

                      {/* Edit & Delete Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDishModal(item);
                          }}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-black py-2 sm:py-1.5 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1 border border-blue-200/80 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDishDelete(item.id, item.name);
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-black py-2 sm:py-1.5 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1 border border-rose-200/80 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center max-w-md mx-auto my-6">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-black text-slate-800 text-sm sm:text-base">No Dishes Found</h3>
              <p className="text-slate-500 text-xs mt-1">
                No items found for this category. You can add new dishes right now!
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <button 
                  onClick={handleBackToCategories}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> All Categories
                </button>
                <button 
                  onClick={() => handleOpenDishModal()} 
                  className="bg-blue-700 hover:bg-blue-800 text-white font-black text-xs px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Dish
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Add / Edit Dish Modal */}
      <Modal 
        isOpen={isDishModalOpen} 
        onClose={() => setIsDishModalOpen(false)} 
        title={editingItem ? 'Edit Food Item Details' : 'Add New Food Item'}
      >
        <form onSubmit={handleDishSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-black text-slate-700 block mb-1">Dish Name</label>
            <input 
              type="text" 
              required 
              value={dishForm.name} 
              onChange={e => setDishForm({ ...dishForm, name: e.target.value })} 
              className="w-full border border-slate-200/90 rounded-2xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="e.g. Masala Dosa, Paneer Tikka"
            />
          </div>

          <div>
            <label className="font-black text-slate-700 block mb-1">Price ($)</label>
            <input 
              type="number" 
              step="0.1"
              required 
              value={dishForm.price} 
              onChange={e => setDishForm({ ...dishForm, price: e.target.value })} 
              className="w-full border border-slate-200/90 rounded-2xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="220"
            />
          </div>

          <div>
            <label className="font-black text-slate-700 block mb-1">Category Name</label>
            <select
              value={dishForm.category_id}
              onChange={e => setDishForm({ ...dishForm, category_id: e.target.value })}
              className="w-full border border-slate-200/90 rounded-2xl p-3 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {categories.map(c => (
                <option key={c.id || c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-black text-slate-700 block">Dish Image</label>
              {dishForm.image_url && (
                <button 
                  type="button" 
                  onClick={() => setDishForm({ ...dishForm, image_url: '' })} 
                  className="text-[10px] font-bold text-rose-600 hover:underline border-0 bg-transparent cursor-pointer"
                >
                  Clear Link
                </button>
              )}
            </div>

            {/* Mobile & Desktop File Upload Button */}
            <div className="mb-2">
              <label className={`w-full ${isOptimizingImage ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200/90'} border rounded-2xl py-2.5 px-3 text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition active:scale-98`}>
                {isOptimizingImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                    <span>Optimizing Photo for Fast Sync...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>Upload Photo from Mobile / Device</span>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  disabled={isOptimizingImage}
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            <div className="relative">
              <input 
                type="text" 
                value={dishForm.image_url} 
                onChange={e => setDishForm(prev => ({ ...prev, image_url: normalizeImageUrl(e.target.value) }))} 
                onPaste={e => {
                  const pasted = e.clipboardData ? e.clipboardData.getData('text') : '';
                  if (pasted) {
                    setTimeout(() => {
                      setDishForm(prev => ({ ...prev, image_url: normalizeImageUrl(pasted) }));
                    }, 50);
                  }
                }}
                onBlur={e => setDishForm(prev => ({ ...prev, image_url: normalizeImageUrl(e.target.value) }))}
                className="w-full border border-slate-200/90 rounded-2xl p-3 pr-9 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="Or paste web image link (https://...)..."
              />
              <ImageIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Quick Sample Image Presets */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-bold text-slate-400 shrink-0">Presets:</span>
              <button 
                type="button"
                onClick={() => setDishForm({ ...dishForm, image_url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500' })}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition shrink-0 border-0 cursor-pointer"
              >
                Dosa
              </button>
              <button 
                type="button"
                onClick={() => setDishForm({ ...dishForm, image_url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500' })}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition shrink-0 border-0 cursor-pointer"
              >
                Curry
              </button>
              <button 
                type="button"
                onClick={() => setDishForm({ ...dishForm, image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500' })}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition shrink-0 border-0 cursor-pointer"
              >
                Biryani
              </button>
              <button 
                type="button"
                onClick={() => setDishForm({ ...dishForm, image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500' })}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition shrink-0 border-0 cursor-pointer"
              >
                Noodles
              </button>
              <button 
                type="button"
                onClick={() => setDishForm({ ...dishForm, image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500' })}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition shrink-0 border-0 cursor-pointer"
              >
                Drink
              </button>
            </div>
          </div>

          {/* Live Image Preview Banner */}
          <div>
            <label className="font-black text-slate-700 block mb-1">Live Image Preview</label>
            <div className="relative h-32 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
              {dishForm.image_url ? (
                <>
                  <img 
                    key={dishForm.image_url}
                    src={dishForm.image_url} 
                    alt="Live Food Preview" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
                    }}
                  />
                  <span className="absolute bottom-2 left-2 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                    Live Preview
                  </span>
                </>
              ) : (
                <div className="text-center text-slate-400 p-4 space-y-1">
                  <ImageIcon className="w-6 h-6 mx-auto stroke-1" />
                  <p className="text-[11px] font-medium">Paste an image link or click a preset above to preview</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => { setIsDishModalOpen(false); setEditingItem(null); }} 
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 text-white font-black px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 text-xs transition active:scale-95 cursor-pointer"
            >
              {editingItem ? 'Save Dish Changes' : 'Create Food Dish'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category CRUD Modal */}
      <Modal 
        isOpen={isCatModalOpen} 
        onClose={() => setIsCatModalOpen(false)} 
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Menu Category'} 
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCatSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-700 block mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              required 
              value={catForm.name} 
              onChange={e => setCatForm(prev => ({ ...prev, name: e.target.value }))} 
              placeholder="e.g. Arunachala Special, Starters, Biryani, Desserts" 
              className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 block mb-1">
              Tagline / Description (Optional)
            </label>
            <input 
              type="text" 
              value={catForm.tagline} 
              onChange={e => setCatForm(prev => ({ ...prev, tagline: e.target.value }))} 
              placeholder="e.g. House Chef Special Creations" 
              className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
            />
          </div>

          {/* Category Image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Category Food Photo</span>
              </label>
              {catForm.image_url && (
                <button 
                  type="button" 
                  onClick={() => setCatForm(prev => ({ ...prev, image_url: '' }))} 
                  className="text-[10px] font-bold text-rose-600 hover:underline border-0 bg-transparent cursor-pointer"
                >
                  Clear Image
                </button>
              )}
            </div>

            {/* Upload Button */}
            <div>
              <label className={`w-full ${isOptimizingCatImage ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200/90'} border rounded-2xl py-2.5 px-3 text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition active:scale-98`}>
                {isOptimizingCatImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                    <span>Optimizing Category Image...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>Upload Photo from Mobile / Computer</span>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  disabled={isOptimizingCatImage}
                  onChange={handleCatFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* URL input */}
            <div className="relative">
              <input 
                type="text" 
                value={catForm.image_url} 
                onChange={e => setCatForm(prev => ({ ...prev, image_url: normalizeImageUrl(e.target.value) }))} 
                onPaste={e => {
                  const pasted = e.clipboardData ? e.clipboardData.getData('text') : '';
                  if (pasted) {
                    setTimeout(() => {
                      setCatForm(prev => ({ ...prev, image_url: normalizeImageUrl(pasted) }));
                    }, 50);
                  }
                }}
                className="w-full border border-slate-200/90 rounded-2xl p-3 pr-9 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="Or paste web image link (https://...)..."
              />
              <ImageIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Quick Presets for Category */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-bold text-slate-400 shrink-0">Presets:</span>
              <button 
                type="button"
                onClick={() => setCatForm({ ...catForm, image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500' })}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition shrink-0 border-0 cursor-pointer"
              >
                Special Sizzler
              </button>
              <button 
                type="button"
                onClick={() => setCatForm({ ...catForm, image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500' })}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition shrink-0 border-0 cursor-pointer"
              >
                Samosa Starters
              </button>
              <button 
                type="button"
                onClick={() => setCatForm({ ...catForm, image_url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500' })}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition shrink-0 border-0 cursor-pointer"
              >
                Golden Dosa
              </button>
              <button 
                type="button"
                onClick={() => setCatForm({ ...catForm, image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500' })}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition shrink-0 border-0 cursor-pointer"
              >
                Dum Biryani
              </button>
              <button 
                type="button"
                onClick={() => setCatForm({ ...catForm, image_url: 'https://images.unsplash.com/photo-1605197586548-ac19d083e954?w=500' })}
                className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition shrink-0 border-0 cursor-pointer"
              >
                Gulab Sweets
              </button>
            </div>

            {/* Live Preview Box */}
            <div>
              <label className="text-[11px] font-black text-slate-600 block mb-1">Live Card Preview</label>
              <div className="relative h-36 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shadow-xs">
                {catForm.image_url ? (
                  <>
                    <img 
                      src={catForm.image_url} 
                      alt="Category Preview" 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />
                    <div className="absolute bottom-2.5 left-3.5 right-3.5 text-white">
                      <p className="font-black text-sm drop-shadow">{catForm.name || 'Category Name'}</p>
                      <p className="text-[11px] text-white/90 drop-shadow line-clamp-1">{catForm.tagline || 'Category tagline / description'}</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-slate-400 p-4 space-y-1">
                    <ImageIcon className="w-6 h-6 mx-auto stroke-1" />
                    <p className="text-[11px] font-medium">Upload or paste an image to see live preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => setIsCatModalOpen(false)} 
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 text-white font-black px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 text-xs transition active:scale-95 cursor-pointer"
            >
              {editingCategory ? 'Save Category Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>

      <ModalUI {...modalConfig} onClose={modalConfig.onClose || (() => setModalConfig(prev => ({ ...prev, isOpen: false })))} />

      {/* Clearance spacer for bottom navigation panel */}
      <div className="h-16 w-full" aria-hidden="true" />
    </div>
  );
};

export default MenuManagement;
