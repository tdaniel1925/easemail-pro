import React from "react";
import Breacrumb from "@/common/Breacrumb";
import HeaderOne from "@/layouts/headers/HeaderOne";
import Cta2Area from "../homes/home/Cta2Area";
import FooterOne from "@/layouts/footers/FooterOne";
import PricingPlanArea from "./PricingPlanArea";
import FaqArea from "../homes/home-2/FaqArea";

const PricingPlan = () => {
	return (
		<>
			<HeaderOne />
			<Breacrumb title="Pricing Plan" subtitle="Pricing Plan" />
      <PricingPlanArea />
      <FaqArea style_2={true} />
			<Cta2Area />
			<FooterOne />
		</>
	);
};

export default PricingPlan;
