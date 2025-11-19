import Breacrumb from "@/common/Breacrumb";
import HeaderOne from "@/layouts/headers/HeaderOne";
import React from "react";
import Cta2Area from "../homes/home/Cta2Area";
import FooterOne from "@/layouts/footers/FooterOne";
import PortfolioArea from "./PortfolioArea";

const Portfolio = () => {
	return (
		<>
			<HeaderOne />
			<Breacrumb title="Portfolio" subtitle="Portfolio" />
			<PortfolioArea />
			<Cta2Area />
			<FooterOne />
		</>
	);
};

export default Portfolio;
