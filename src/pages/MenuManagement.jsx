import React, { useState, useEffect, useMemo } from 'react';
import { menuService } from '../services/adminService';
import { Modal } from '../components/Modal';
import { ModalUI } from '../components/ModalUI';
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
  Utensils,
  FolderPlus
} from 'lucide-react';
import { MENU_CATEGORIES } from '../constants/categories';

export const MenuManagement = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(MENU_CATEGORIES);
  
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
  const [dishForm, setDishForm] = useState({ 
    name: '', 
    price: '', 
    category_id: 'Arunachala Special', 
    image_url: ''
  });

  const loadData = async () => {
    const itms = await menuService.getMenuItems();
    const cats = await menuService.getCategories();
    setItems(itms || []);
    if (cats && cats.length > 0) setCategories(cats);
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  // Compute item count per category dynamically
  const categoryCounts = useMemo(() => {
    const counts = {};
    categories.forEach(c => { counts[c.name] = 0; });
    items.forEach(item => {
      const cat = item.category_name || item.category_id;
      if (cat && counts[cat] !== undefined) {
        counts[cat]++;
      } else if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [categories, items]);

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target.result;
        setDishForm(prev => ({ ...prev, image_url: result }));
      };
      reader.readAsDataURL(file);
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
    if (item) {
      setDishForm({ 
        name: item.name, 
        price: item.price, 
        category_id: item.category_name || item.category_id || (selectedCatId || 'Arunachala Special'), 
        image_url: item.image_url || ''
      });
    } else {
      setDishForm({ 
        name: '', 
        price: '', 
        category_id: selectedCatId || 'Arunachala Special', 
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
      });
    }
    setIsDishModalOpen(true);
  };

  const handleDishSubmit = async (e) => {
    e.preventDefault();
    if (!dishForm.name || !dishForm.price) return;

    const finalImageUrl = normalizeImageUrl(dishForm.image_url);

    await menuService.saveMenuItem({ 
      ...(editingItem ? { id: editingItem.id } : {}), 
      ...dishForm, 
      image_url: finalImageUrl,
      price: Number(dishForm.price) 
    });
    setIsDishModalOpen(false);
    loadData();
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
        await menuService.deleteMenuItem(id);
        loadData();
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

  const handleCatFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCatForm(prev => ({ ...prev, image_url: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    if (!catForm.name || !catForm.name.trim()) return;

    const trimmedName = catForm.name.trim();
    const finalImageUrl = normalizeImageUrl(catForm.image_url) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';

    const catPayload = {
      id: editingCategory ? (editingCategory.id || editingCategory.name) : `cat-${Date.now()}`,
      name: trimmedName,
      badge: catForm.badge ? catForm.badge.trim() : '',
      tagline: catForm.tagline ? catForm.tagline.trim() : '',
      image_url: finalImageUrl
    };

    const oldName = editingCategory ? editingCategory.name : null;
    await menuService.saveCategory(catPayload, oldName);

    if (selectedCatId && oldName && selectedCatId === oldName) {
      setSelectedCatId(trimmedName);
    }

    setIsCatModalOpen(false);
    await loadData();
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
        await menuService.deleteCategory(cat.id || cat.name);
        if (selectedCatId === cat.name) {
          setSelectedCatId(null);
        }
        await loadData();
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
          {/* Menu Category Cards Grid with Real Dish Photos, White Cards & Quick Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4.5">
            {categories.map((cat) => {
              const count = categoryCounts[cat.name] || 0;

              return (
                <div
                  key={cat.id || cat.name}
                  onClick={() => handleSelectCategory(cat.name)}
                  className="bg-white hover:bg-slate-50/80 p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-blue-400 transition-all duration-300 text-left flex flex-col justify-between group cursor-pointer relative overflow-hidden active:scale-98 hover:-translate-y-1"
                >
                  {/* Real Dish Photography */}
                  <div className="relative h-28 sm:h-36 w-full rounded-2xl overflow-hidden mb-3 bg-slate-100 shadow-2xs">
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
                    
                    {/* Top-Left: Category Quick Actions (Edit & Delete) */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCatModal(cat);
                        }}
                        title={`Edit ${cat.name}`}
                        className="p-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-blue-700 shadow-md transition backdrop-blur-xs border border-white/40 active:scale-90 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCatDelete(cat);
                        }}
                        title={`Delete ${cat.name}`}
                        className="p-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-red-600 shadow-md transition backdrop-blur-xs border border-white/40 active:scale-90 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Middle: Full Category Name & Tagline */}
                  <div className="my-1 space-y-0.5">
                    <h3 className="font-black text-sm sm:text-base text-slate-900 group-hover:text-blue-700 transition-colors leading-tight line-clamp-1">
                      {cat.name}
                    </h3>
                    {cat.tagline && (
                      <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-snug line-clamp-1">
                        {cat.tagline}
                      </p>
                    )}
                  </div>

                  {/* Bottom Row: Manage action */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end w-full">
                    <span className="text-slate-700 group-hover:text-blue-700 font-black text-xs flex items-center gap-0.5 group-hover:translate-x-1 transition-all">
                      Manage <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =========================================================================
          VIEW 2: CATEGORY DISHES MANAGEMENT VIEW (Shown when category is clicked)
          OR SEARCH RESULTS VIEW
         ========================================================================= */}
      {(selectedCatId || searchQuery.trim()) && (
        <section className="space-y-4">
          
          {/* Top Navigation & Back Header */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <button
              onClick={handleBackToCategories}
              className="bg-white hover:bg-slate-100 text-slate-800 font-black text-xs sm:text-sm px-3.5 py-2 rounded-2xl border border-slate-200 shadow-2xs inline-flex items-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-blue-700" />
              <span>All Categories</span>
            </button>

            {selectedCategoryMeta && (
              <div className="flex items-center gap-2.5">
                <img
                  src={selectedCategoryMeta.image_url}
                  alt={selectedCategoryMeta.name}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
                  }}
                />
                <div className="text-right sm:text-left">
                  <span className="text-[10px] sm:text-xs text-blue-700 font-extrabold uppercase tracking-wider block">
                    Menu Category
                  </span>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {selectedCategoryMeta.name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleOpenCatModal(selectedCategoryMeta)}
                      className="p-1 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200/80 transition cursor-pointer"
                      title="Edit Category Name, Image or Badge"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCatDelete(selectedCategoryMeta)}
                      className="p-1 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200/80 transition cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Category Switcher Pills */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2 border border-slate-200/90 shadow-xs">
            <div className="flex gap-2 overflow-x-auto scrollbar-none py-0.5 items-center">
              <button
                onClick={handleBackToCategories}
                className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> All Categories
              </button>
              {categories.map(c => {
                const isCur = selectedCatId === c.name;
                return (
                  <button
                    key={c.id || c.name}
                    onClick={() => handleSelectCategory(c.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                      isCur
                        ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md shadow-blue-500/20 scale-102'
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
                className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 flex items-center gap-1 transition shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Category
              </button>
            </div>
          </div>

          {/* Category Dishes Counter Bar */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-blue-700" />
              <span>
                {searchQuery ? `Search Results for "${searchQuery}"` : selectedCatId}
              </span>
              <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-black">
                {filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'}
              </span>
            </h3>

            <button 
              onClick={() => handleOpenDishModal()} 
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl inline-flex items-center gap-1 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add to {selectedCatId || 'Menu'}
            </button>
          </div>

          {/* Food Cards Grid */}
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {filteredItems.map(item => {
                return (
                  <div 
                    key={item.id}
                    onClick={() => handleOpenDishModal(item)}
                    className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all duration-300 overflow-hidden flex flex-col justify-between group h-full relative cursor-pointer"
                  >
                    <div className="relative h-28 sm:h-40 w-full bg-slate-100 overflow-hidden">
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
                        <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20 shadow-xs">
                          {item.category_name}
                        </span>
                      )}
                    </div>

                    <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3">
                      <div>
                        <h3 className="font-black text-slate-900 text-xs sm:text-base group-hover:text-blue-700 transition-colors leading-tight line-clamp-2">
                          {item.name}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Price</span>
                          <span className="text-sm sm:text-lg font-black text-slate-900">₹{item.price}</span>
                        </div>
                      </div>

                      {/* Edit & Delete Actions */}
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDishModal(item);
                          }}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-black py-1.5 px-2 rounded-xl text-[10px] sm:text-xs flex items-center justify-center gap-1 border border-blue-200/80 transition"
                        >
                          <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Edit
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDishDelete(item.id, item.name);
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-black py-1.5 px-2 rounded-xl text-[10px] sm:text-xs flex items-center justify-center gap-1 border border-rose-200/80 transition"
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Delete
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
            <label className="font-black text-slate-700 block mb-1">Price (₹)</label>
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
              <label className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/90 rounded-2xl py-2.5 px-3 text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition active:scale-98">
                <Upload className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Upload Photo from Mobile / Device</span>
                <input 
                  type="file" 
                  accept="image/*" 
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

          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-600 hover:from-blue-800 hover:to-indigo-800 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 text-xs transition active:scale-95 mt-2"
          >
            {editingItem ? 'Save Dish Changes' : 'Create Food Dish'}
          </button>
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
              <label className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/90 rounded-2xl py-2.5 px-3 text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition active:scale-98">
                <Upload className="w-4 h-4 text-blue-700 shrink-0" />
                <span>Upload Photo from Mobile / Computer</span>
                <input 
                  type="file" 
                  accept="image/*" 
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
