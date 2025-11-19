"use client";
import React from 'react';

const SearchArea = ({setSearchOpen, isSearchOpen} : any) => {
  return (
    <>
      <div className={`search-bg-overlay ${isSearchOpen ? 'open' : ''}`} id="searchOverlay" onClick={() => setSearchOpen(false)}></div>
      <div className={`search-form-popup ${isSearchOpen ? 'open' : ''}`}>
        <h2 className="mb-4">Ask me anything...</h2>
        <button type="button" className="close-btn" id="searchClose" aria-label="Close" onClick={() => setSearchOpen(false)}>
          &times;
        </button>
        <form className="search-form" onClick={(e) => e.preventDefault()}>
          <input type="search" className="form-control" placeholder="Search..." aria-label="Search" />
          <button type="submit" className="btn btn-dark" aria-label="Search">
            <span>Search</span>
            <span>Search</span>
          </button>
        </form>
      </div>
    </>
  );
};

export default SearchArea;