
"use client";
import OffCanvas from '@/common/OffCanvas';
import SearchArea from '@/common/SearchArea';
import menu_data from '@/data/menu-data';
import useSticky from '@/hooks/use-sticky';
import Link from 'next/link';
import { useEffect, useState } from "react";

const HeaderOne = ({style_2} :any) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "light-mode";
    }
    return "light-mode";
  });

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light-mode" ? "dark-mode" : "light-mode"));
  };

  const { sticky } = useSticky()
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openCanvas, setOpenCavas] = useState(false)


  const [navTitle, setNavTitle] = useState("");
	//openMobileMenu
	const openMobileMenu = (menu: string) => {
		if (navTitle === menu) {
			setNavTitle("");
		} else {
			setNavTitle(menu);
		}
	};

  const [navTitle2, setNavTitle2] = useState("");
	//openMobileMenu
	const openMobileMenu2 = (menu: string) => {
		if (navTitle2 === menu) {
			setNavTitle2("");
		} else {
			setNavTitle2(menu);
		}
	};



 
 

 

 

  return (
    <>
      <header className={`header-area ${sticky && "sticky-on"} ${menuOpen ? 'mobile-menu-open' : ''}`}>
        <nav className="navbar navbar-expand-lg">
          <div className="container">

            <Link className="navbar-brand" href="/">
              <img className="dark-logo" src="/assets/img/core-img/logo.png" alt="" />
              <img className="light-logo" src="/assets/img/core-img/logo-light.png" alt="" />
            </Link>


            <button onClick={() => setMenuOpen(!menuOpen)} className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#vorixNav"
              aria-controls="vorixNav" aria-expanded="false" aria-label="Toggle navigation">
              <span className="material-symbols-outlined">view_cozy</span>
            </button>


            <div className={`collapse navbar-collapse justify-content-end ${menuOpen ? 'show' : ''}`} id="vorixNav">
              <ul className="navbar-nav navbar-nav-scroll">
                {menu_data.map((item, i) => (
                  <li key={i} className="vorix-dd">
                    <Link href={item.link} 
                    onMouseEnter={() =>  setNavTitle(item.title)}
                     
                    onClick={() => openMobileMenu(item.title)}>{item.title}</Link>
                    {item.has_dropdown &&
                      <ul className="vorix-dd-menu" style={{ display: navTitle === item.title ? 'block' : 'none' }}>
                        {item.sub_menus.map((sub_menu, index) => (
                          <li key={index} className="vorix-dd">
                            <Link href={sub_menu.link} 
                            onClick={() => openMobileMenu2(sub_menu.title)}
                            onMouseEnter={() =>  setNavTitle2(sub_menu.title)}
                            >{sub_menu.title}</Link>

                            {'has_inner_dropdown' in sub_menu && sub_menu.has_inner_dropdown &&
                              <ul className="vorix-dd-menu" style={{ display: navTitle2 === sub_menu.title ? 'block' : 'none' }}>
                                {sub_menu?.inner_submenu?.map((inner_menu, inner_index) => (
                                  <li key={inner_index}>
                                    <Link href={inner_menu.link}>{inner_menu.title}</Link>
                                  </li>
                                ))}
                              </ul>
                            }
                          </li>
                        ))}
                      </ul>
                    }
                  </li>
                ))}

              </ul>

              <div className="d-flex align-items-center">

                <div className="header-search-btn" id="searchButton">
                  <button className="btn">
                    <svg onClick={() => setSearchOpen(!isSearchOpen)} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <g clipPath="url(#clip0_1_195)">
                        <path fillRule="evenodd" clipRule="evenodd"
                          d="M10.5003 2C9.14485 2.00012 7.80912 2.32436 6.60451 2.94569C5.3999 3.56702 4.36135 4.46742 3.57549 5.57175C2.78963 6.67609 2.27926 7.95235 2.08696 9.29404C1.89466 10.6357 2.026 12.004 2.47003 13.2846C2.91406 14.5652 3.6579 15.7211 4.63949 16.6557C5.62108 17.5904 6.81196 18.2768 8.11277 18.6576C9.41358 19.0384 10.7866 19.1026 12.1173 18.8449C13.448 18.5872 14.6977 18.015 15.7623 17.176L19.4143 20.828C19.6029 21.0102 19.8555 21.111 20.1177 21.1087C20.3799 21.1064 20.6307 21.0012 20.8161 20.8158C21.0015 20.6304 21.1066 20.3796 21.1089 20.1174C21.1112 19.8552 21.0104 19.6026 20.8283 19.414L17.1763 15.762C18.1642 14.5086 18.7794 13.0024 18.9514 11.4157C19.1233 9.82905 18.8451 8.22602 18.1485 6.79009C17.4519 5.35417 16.3651 4.14336 15.0126 3.29623C13.66 2.44911 12.0962 1.99989 10.5003 2ZM4.00025 10.5C4.00025 8.77609 4.68507 7.12279 5.90406 5.90381C7.12305 4.68482 8.77635 4 10.5003 4C12.2242 4 13.8775 4.68482 15.0964 5.90381C16.3154 7.12279 17.0003 8.77609 17.0003 10.5C17.0003 12.2239 16.3154 13.8772 15.0964 15.0962C13.8775 16.3152 12.2242 17 10.5003 17C8.77635 17 7.12305 16.3152 5.90406 15.0962C4.68507 13.8772 4.00025 12.2239 4.00025 10.5Z"
                          fill="#FEFEFE" />
                      </g>
                      <defs>
                        <clipPath id="clip0_1_195">
                          <rect width="24" height="24" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                  </button>
                </div>

                <button id="theme-toggle" onClick={toggleTheme}
                  className={`theme-btn ${theme === "light-mode" ? "" : "light-mode-active"}`}>
                  <span className="material-symbols-outlined moon">clear_day</span>
                  <span className="material-symbols-outlined sun">bedtime</span>
                </button>
                {style_2 ?
                <div className="mb-3 mb-lg-0" id="sideMenuButton">
                <a 
                onClick={() => setOpenCavas(!openCanvas)}
                className="btn btn-primary sideMenuButton" data-bs-toggle="offcanvas" href="#sideMenuOffcanvas"
                  role="button" aria-controls="sideMenuOffcanvas">
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                      fill="none">
                      <path d="M3 12H21" stroke="#0E0E0E" strokeWidth="2" strokeLinecap="round" />
                      <path d="M3 6H21" stroke="#0E0E0E" strokeWidth="2" strokeLinecap="round" />
                      <path d="M3 18H21" stroke="#0E0E0E" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                      fill="none">
                      <path d="M3 12H21" stroke="#0E0E0E" strokeWidth="2" strokeLinecap="round" />
                      <path d="M3 6H21" stroke="#0E0E0E" strokeWidth="2" strokeLinecap="round" />
                      <path d="M3 18H21" stroke="#0E0E0E" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                </a>
              </div>
              :

              <Link className="btn btn-primary" href="/contact"><span>GET IN TOUCH</span><span>GET IN TOUCH</span></Link>

              }


              </div>
            </div>
          </div>
        </nav>
      </header>
      <SearchArea setSearchOpen={setSearchOpen} isSearchOpen={isSearchOpen} />
      <OffCanvas setOpenCavas={setOpenCavas} openCanvas={openCanvas} />
    </>
  );
};

export default HeaderOne;