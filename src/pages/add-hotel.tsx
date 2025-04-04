import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaPlane, FaHotel, FaMapMarkerAlt, FaStar, FaPlus, FaTrash, FaImage, FaArrowLeft } from 'react-icons/fa';

export default function AddHotel() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    address: '',
    location: '',
    starRating: 3.0,
    images: [''] // Start with one empty image URL
  });

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setIsLoggedIn(true);
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'starRating') {
      const numValue = parseFloat(value);
      if (numValue < 1) {
        setFormData(prev => ({ ...prev, starRating: 1 }));
      } else if (numValue > 5) {
        setFormData(prev => ({ ...prev, starRating: 5 }));
      } else {
        setFormData(prev => ({ ...prev, starRating: numValue }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => i === index ? value : img)
    }));

    // Update preview images
    setPreviewImages(prev => {
      const newPreview = [...prev];
      newPreview[index] = value;
      return newPreview;
    });
  };

  const addImageField = () => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, '']
    }));
  };

  const removeImageField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/hotels/addHotel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          images: formData.images.filter(url => url.trim() !== '')
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Hotel added successfully!');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setError(data.error || 'Failed to add hotel');
      }
    } catch (err) {
      setError('An error occurred while adding the hotel');
      console.error('Error adding hotel:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn) {
    return null; // Will redirect to login
  }

  return (
    <>
      <Head>
        <title>Add Hotel - FlyNext</title>
        <meta name="description" content="Add a new hotel to FlyNext" />
      </Head>

      <div className="min-h-screen relative py-12 px-4 sm:px-6 lg:px-8">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGM0LjQxOCAwIDgtMy41ODIgOC04cy0zLjU4Mi04LTgtOC04IDMuNTgyLTggOCAzLjU4MiA4IDggOHoiIGZpbGw9IiNlZWYiLz48cGF0aCBkPSJNMTIgMjJjMC0yLjIxIDEuNzk0LTRzNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6IiBmaWxsPSIjZWVmIi8+PC9nPjwvc3ZnPg==')] opacity-10"></div>
        </div>

        <div className="max-w-3xl mx-auto relative">
          {/* Back Button */}
          <Link 
            href="/"
            className="absolute top-4 left-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>

          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center text-blue-600 text-2xl font-bold mb-4 hover:text-blue-700 transition-colors">
              <FaPlane className="mr-2" />
              FlyNext
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Add a New Hotel</h1>
            <p className="text-lg text-gray-600">Share your hotel with travelers around the world</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg shadow-sm">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-lg shadow-sm">
              <p className="text-green-700">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Hotel Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter hotel name"
                />
              </div>

              <div>
                <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <input
                  type="url"
                  id="logo"
                  name="logo"
                  required
                  value={formData.logo}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                required
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter full address"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location (City, Country)
              </label>
              <div className="relative">
                <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  id="location"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., Paris, France"
                />
              </div>
            </div>

            <div>
              <label htmlFor="starRating" className="block text-sm font-medium text-gray-700 mb-1">
                Star Rating
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  id="starRating"
                  name="starRating"
                  required
                  min="1"
                  max="5"
                  step="0.1"
                  value={formData.starRating}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                      e.preventDefault();
                    }
                  }}
                  className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <FaStar
                      key={i}
                      className={`text-2xl ${
                        i < Math.floor(formData.starRating)
                          ? 'text-yellow-400'
                          : i < formData.starRating
                          ? 'text-yellow-400 opacity-50'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hotel Images
              </label>
              <div className="space-y-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="flex-1">
                      <div className="relative">
                        <input
                          type="url"
                          value={image}
                          onChange={(e) => handleImageChange(index, e.target.value)}
                          placeholder="Image URL"
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        {previewImages[index] && (
                          <div className="mt-2">
                            <img
                              src={previewImages[index]}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-32 object-cover rounded-md shadow-sm"
                              onError={() => {
                                const newPreview = [...previewImages];
                                newPreview[index] = '';
                                setPreviewImages(newPreview);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    {formData.images.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImageField(index)}
                        className="mt-1 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addImageField}
                  className="inline-flex items-center px-4 py-2 border border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FaPlus className="mr-2" />
                  Add Another Image
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding Hotel...
                  </span>
                ) : (
                  'Add Hotel'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
} 