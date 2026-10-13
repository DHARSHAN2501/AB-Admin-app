import React, { useState, useEffect } from 'react';
import { menuService } from '../services/adminService';
import { Modal } from '../components/Modal';
import { ModalUI } from '../components/ModalUI';
import { Plus, Edit2, Trash2, Search, Grid, Image as ImageIcon, Upload } from 'lucide-react';
import { MENU_CHEF_IMAGE_BASE64 } from '../assets/menu_chef_b64';

export const MenuManagement = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  
  // Modal State
  const [isDishModalOpen, setIsDishModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [dishForm, setDishForm] = useState({ 
    name: '', 
    price: '', 
    category_id: 'South Indian', 
    image_url: ''
  });

  const loadData = async () => {
    const itms = await menuService.getMenuItems();
    const cats = await menuService.getCategories();
    setItems(itms || []);
    setCategories(cats || []);
  };

  useEffect(() => { 
    loadData(); 
  }, []);

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

    // Extract direct image URL if user pasted a Google Images / Bing / Search engine URL
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

    // Data URIs or local relative paths
    if (trimmed.startsWith('data:image') || trimmed.startsWith('/')) {
      return trimmed;
    }

    // Raw Base64 string without data: header
    if (trimmed.length > 50 && !trimmed.includes(' ') && !trimmed.includes('.') && !trimmed.includes('/')) {
      return `data:image/png;base64,${trimmed}`;
    }

    // Ensure direct web URLs have https:// scheme if missing
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
        category_id: item.category_id || 'South Indian', 
        image_url: item.image_url || ''
      });
    } else {
      setDishForm({ 
        name: '', 
        price: '', 
        category_id: 'South Indian', 
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

  const filteredItems = items.filter(it => {
    const matchesSearch = !searchQuery.trim() || it.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCatId === 'ALL' || it.category_id === selectedCatId;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white rounded-3xl p-4 sm:p-6 border border-slate-800/80 shadow-xl flex flex-row items-center justify-between gap-3 sm:gap-6">
        {/* Left Content Area */}
        <div className="z-10 space-y-2 sm:space-y-3 flex-1 min-w-0">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Menu Management
            </h1>
            <p className="text-blue-200/80 text-[11px] sm:text-xs md:text-sm font-medium leading-normal max-w-md mt-0.5">
              Add, edit & delete food menu items with real-time price updates
            </p>
          </div>

          <div>
            <button 
              onClick={() => handleOpenDishModal()} 
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-3.5 sm:px-4.5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-lg shadow-blue-500/25 border border-white/20 active:scale-98 transition shrink-0"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Add Food Item</span>
            </button>
          </div>
        </div>

        {/* Right Chef Image Area */}
        <div className="w-28 h-28 sm:w-44 sm:h-44 md:w-56 md:h-56 shrink-0 flex items-center justify-center -my-4 -mr-3 sm:-my-8 sm:-mr-6 relative z-10">
          <img 
            src={MENU_CHEF_IMAGE_BASE64} 
            alt="Menu Chef Illustration" 
            className="w-full h-full object-contain filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] hover:scale-105 transition duration-300 transform scale-110"
          />
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search food dishes by name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-xs"
        />
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCatId('ALL')}
          className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition ${
            selectedCatId === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Items ({items.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCatId(cat.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition ${
              selectedCatId === cat.id
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Food Cards Grid */}
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
              <option value="South Indian">South Indian</option>
              <option value="North Indian">North Indian</option>
              <option value="Biryani & Rice">Biryani & Rice</option>
              <option value="Indo Chinese">Indo Chinese</option>
              <option value="Drinks & Desserts">Drinks & Desserts</option>
              {categories.map(c => c.name && !["South Indian", "North Indian", "Biryani & Rice", "Indo Chinese", "Drinks & Desserts"].includes(c.name) ? (
                <option key={c.id || c.name} value={c.name}>{c.name}</option>
              ) : null)}
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

      <ModalUI {...modalConfig} onClose={modalConfig.onClose || (() => setModalConfig(prev => ({ ...prev, isOpen: false })))} />

      {/* Clearance spacer for bottom navigation panel */}
      <div className="h-16 w-full" aria-hidden="true" />
    </div>
  );
};

export default MenuManagement;
