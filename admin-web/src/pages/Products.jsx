import React, { useEffect, useState } from 'react'
import api from '../utils/api'
import './Pages.css'

const Products = () => {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: ''
  })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const response = await api.get('/admin/products')
      setProducts(response.data)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct._id}`, formData)
        alert('Product updated successfully')
      } else {
        await api.post('/admin/products', formData)
        alert('Product created successfully')
      }
      setShowModal(false)
      setEditingProduct(null)
      setFormData({ name: '', description: '', category: '' })
      loadProducts()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Failed to save product')
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category
    })
    setShowModal(true)
  }

  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Delete product "${productName}"? This cannot be undone.`)) return
    
    try {
      await api.delete(`/admin/products/${productId}`)
      alert('Product deleted successfully')
      loadProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    }
  }

  const handleCreateNew = () => {
    setEditingProduct(null)
    setFormData({ name: '', description: '', category: '' })
    setShowModal(true)
  }

  if (isLoading) {
    return <div className="loading">Loading products...</div>
  }

  const categories = [...new Set(products.map(p => p.category))]

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Products Management</h1>
        <p className="page-subtitle">Manage wellness devices and equipment</p>
      </div>

      <button className="btn btn-primary" onClick={handleCreateNew} style={{marginBottom: '24px'}}>
        ➕ Add New Product
      </button>

      {categories.map((category) => (
        <div key={category} style={{marginBottom: '32px'}}>
          <h2 style={{color: '#8FBC8F', fontSize: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            📦 {category}
          </h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px'}}>
            {products.filter(p => p.category === category).map((product) => (
              <div key={product._id} className="card">
                <h3 style={{color: '#E8E8E8', fontSize: '18px', marginBottom: '8px'}}>{product.name}</h3>
                <p style={{color: '#999', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5'}}>
                  {product.description}
                </p>
                <div style={{display: 'flex', gap: '8px'}}>
                  <button className="btn btn-secondary" onClick={() => handleEdit(product)}>
                    ✏️ Edit
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDelete(product._id, product.name)}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {products.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <p className="empty-state-text">No products found</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{maxWidth: '600px'}}>
            <div className="modal-header">
              <h2 className="modal-title">{editingProduct ? 'Edit Product' : 'Create New Product'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="input-group">
                  <label>Product Name *</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Cryotherapy Chamber"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe the product and its benefits"
                    rows={3}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Category *</label>
                  <input
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    placeholder="e.g., Cryotherapy, Light Therapy, Recovery"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products
