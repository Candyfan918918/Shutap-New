import * as React from "react";
import { Html, Head, Body } from "@react-email/components";

interface ReauthenticationEmailProps {
  token: string;
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en">
    {"\n"}
    <Head>
      {"\n"}
      <meta charSet="utf-8" />
      {"\n"}
      <meta content="width=device-width, initial-scale=1" name="viewport" />
      {"\n"}
      <meta content="IE=edge" httpEquiv="X-UA-Compatible" />
      {"\n"}
      <meta content="light" name="color-scheme" />
      {"\n"}
      <meta content="light" name="supported-color-schemes" />
      {"\n"}
      <title>{"your verification code"}</title>
      {"\n"}
      {/*[if mso]>
<style>* {font-family: Arial, sans-serif !important;}</style>
<![endif]*/}
      {"\n"}
      <style>
        {
          "\n  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }\n  table { border-collapse:collapse; }\n  img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }\n  @media only screen and (max-width:640px) { .card { width:100% !important; } .px { padding-left:22px !important; padding-right:22px !important; } .h1 { font-size:28px !important; } }"
        }
      </style>
      {"\n"}
      <link
        href="https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz@1,18&display=swap"
        rel="stylesheet"
      />
      {"\n"}
    </Head>
    {"\n"}
    <Body style={{ margin: "0", padding: "0", backgroundColor: "#ffffff" }}>
      {"\n"}
      <div
        style={{
          display: "none",
          maxHeight: "0",
          overflow: "hidden",
          opacity: 0,
          color: "transparent",
          height: "0",
          width: "0",
        }}
      >
        {"your code is inside. it expires soon.​ ​ ​ ​ ​ ​"}
      </div>
      {"\n"}
      <table
        border="0"
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{ backgroundColor: "#ffffff" }}
        width="100%"
      >
        {"\n"}
        <tr>
          {"\n"}
          <td align="center" style={{ padding: "28px 12px 40px" }}>
            {"\n"}
            <table
              border="0"
              cellPadding={0}
              cellSpacing={0}
              className="card"
              role="presentation"
              style={{ width: "600px", maxWidth: "600px" }}
              width="600"
            >
              {"\n"}
              {/* accent rule */}
              {"\n"}
              {/* HEADER */}
              {"\n"}
              <tr>
                {"\n"}
                <td
                  align="left"
                  className="px"
                  style={{ padding: "4px 40px 22px", borderBottom: "1px solid #f0e6ea" }}
                >
                  {"\n"}
                  <img
                    alt="shutap"
                    height="29"
                    src="https://shutap.com/email/shutap-wordmark.png"
                    style={{ display: "block", width: "104px", height: "29px" }}
                    width="104"
                  />
                  {"\n"}
                </td>
                {"\n"}
              </tr>
              {"\n"}
              {/* BODY */}
              {"\n"}
              <tr>
                {"\n"}
                <td className="px" style={{ padding: "26px 40px 0" }}>
                  {"\n"}
                  <div
                    style={{
                      fontFamily: "'Sora',Arial,sans-serif",
                      fontWeight: 700,
                      fontSize: "12px",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "#c1216b",
                      textAlign: "left",
                    }}
                  >
                    {"SHUTAP · verification code"}
                  </div>
                  {"\n"}
                  <div
                    className="h1"
                    style={{
                      fontFamily: "'Sora',Arial,sans-serif",
                      fontWeight: 800,
                      fontSize: "32px",
                      lineHeight: "1.15",
                      letterSpacing: "-0.02em",
                      color: "#0b080f",
                      textAlign: "left",
                      marginTop: "10px",
                    }}
                  >
                    {"quick check it's you."}
                  </div>
                  {"\n"}
                  <p
                    style={{
                      fontFamily: "'Inter',Arial,sans-serif",
                      fontSize: "16.5px",
                      lineHeight: "1.7",
                      color: "#2a2329",
                      textAlign: "left",
                      margin: "16px 4px 0",
                    }}
                  >
                    {"enter this code to confirm the change. it expires soon."}
                  </p>
                  {"\n"}
                </td>
                {"\n"}
              </tr>
              {"\n"}
              {/* ACTION */}
              {"\n"}
              <tr>
                {"\n"}
                <td align="left" className="px" style={{ padding: "26px 40px 0" }}>
                  {"\n"}
                  <table
                    border="0"
                    cellPadding={0}
                    cellSpacing={0}
                    role="presentation"
                    style={{ margin: "0 auto" }}
                  >
                    {"\n"}
                    <tr>
                      {"\n"}
                      <td
                        align="left"
                        style={{
                          background: "#fcf1f5",
                          border: "1px solid #f3d6e3",
                          borderRadius: "12px",
                          padding: "18px 34px",
                          fontFamily: "'Sora',Arial,sans-serif",
                          fontSize: "32px",
                          fontWeight: 800,
                          letterSpacing: "0.28em",
                          color: "#0b080f",
                        }}
                      >
                        {token}
                      </td>
                      {"\n"}
                    </tr>
                    {"\n"}
                  </table>
                  {"\n"}
                </td>
                {"\n"}
              </tr>
              {"\n"}
              {/* SAFETY LINE */}
              {"\n"}
              <tr>
                {"\n"}
                <td className="px" style={{ padding: "24px 40px 0" }}>
                  {"\n"}
                  <p
                    style={{
                      fontFamily: "'Inter',Arial,sans-serif",
                      fontSize: "16.5px",
                      lineHeight: "1.7",
                      color: "#2a2329",
                      textAlign: "left",
                      margin: "0",
                    }}
                  >
                    {"didn't request a code? ignore this. nothing changes without it."}
                  </p>
                  {"\n"}
                </td>
                {"\n"}
              </tr>
              {"\n"}
              {/* SIGNATURE */}
              {"\n"}
              <tr>
                {"\n"}
                <td className="px" style={{ padding: "30px 40px 26px" }}>
                  {"\n"}
                  <div
                    style={{
                      fontFamily: "'Inter',Arial,sans-serif",
                      fontSize: "16px",
                      lineHeight: "1.65",
                      color: "#2a2329",
                    }}
                  >
                    {"Say it funnier,"}
                  </div>
                  {"\n"}
                  <div
                    style={{
                      fontFamily: "'Sora',Arial,sans-serif",
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "#0b080f",
                      marginTop: "6px",
                    }}
                  >
                    {"Candy Fan"}
                  </div>
                  {"\n"}
                  <div
                    style={{
                      fontFamily: "'Inter',Arial,sans-serif",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      color: "#6f666c",
                    }}
                  >
                    {"Founder, Shutap · "}
                    <a href="mailto:hello@shutap.com" style={{ color: "#c1216b" }}>
                      {"hello@shutap.com"}
                    </a>
                    {"\n"}
                  </div>
                  {"\n"}
                </td>
                {"\n"}
              </tr>
              {"\n"}
              <tr>
                {"\n"}
                <td
                  className="px"
                  style={{
                    padding: "26px 40px 0",
                    borderTop: "1px solid #f0e6ea",
                    fontFamily: "'Inter',Arial,sans-serif",
                    fontSize: "12px",
                    lineHeight: "1.65",
                    color: "#9e8a94",
                  }}
                >
                  {"\n"}
                  <a
                    href="https://shutap.com"
                    style={{ color: "#9e8a94", textDecoration: "underline" }}
                  >
                    {"shutap.com"}
                  </a>
                  {" · you're getting this because someone used this address on shutap."}
                </td>
                {"\n"}
              </tr>
              {"\n"}
              <tr>
                {"\n"}
                <td
                  className="px"
                  style={{
                    padding: "2px 40px 0",
                    fontFamily: "'Inter',Arial,sans-serif",
                    fontSize: "12px",
                    lineHeight: "1.65",
                    color: "#9e8a94",
                  }}
                >
                  {"Shutap, Inc.  ·  2261 Market St #4512, San Francisco, CA 94114"}
                </td>
                {"\n"}
              </tr>
              {"\n"}
            </table>
            {"\n"}
            {/* FOOTER */}
            {"\n"}
          </td>
          {"\n"}
        </tr>
        {"\n"}
      </table>
      {"\n"}
    </Body>
    {"\n"}
  </Html>
);

export default ReauthenticationEmail;
