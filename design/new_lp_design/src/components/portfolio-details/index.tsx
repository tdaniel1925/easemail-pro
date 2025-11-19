import React from "react";
import Breacrumb from "@/common/Breacrumb";
import HeaderOne from "@/layouts/headers/HeaderOne";
import Cta2Area from "../homes/home/Cta2Area";
import FooterOne from "@/layouts/footers/FooterOne";
import PortfolioDetailsArea from "./PortfolioDetailsArea";

const PortfolioDetails = () => {
	return (
		<>
			<HeaderOne />
			<Breacrumb title="Portfolio Details" subtitle="Portfolio" />
			<PortfolioDetailsArea />
			<Cta2Area />
			<FooterOne />
		</>
	);
};

export default PortfolioDetails;
