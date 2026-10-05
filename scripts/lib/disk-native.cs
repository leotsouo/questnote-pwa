using System;
using System.IO;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using Microsoft.Win32.SafeHandles;

// Metadata opens never request content and never follow reparse points.
public sealed class QuestDiskFile {
 public string Path {get;set;} public long Bytes {get;set;} public long Allocated {get;set;}
 public uint Links {get;set;} public string Id {get;set;} public long Attributes {get;set;}
 public DateTime Modified {get;set;}
}
public sealed class QuestDiskScan {
 public List<QuestDiskFile> Files=new(); public List<string> Directories=new();
 public List<string> Unknown=new();
}
public static class QuestDiskNative {
 [StructLayout(LayoutKind.Sequential)] struct Standard {public long Allocation;public long Length;public uint Links;[MarshalAs(UnmanagedType.U1)]public bool DeletePending;[MarshalAs(UnmanagedType.U1)]public bool Directory;}
 [StructLayout(LayoutKind.Sequential)] struct Info {public uint Attributes,CreationLow,CreationHigh,AccessLow,AccessHigh,WriteLow,WriteHigh,Volume,SizeHigh,SizeLow,Links,IndexHigh,IndexLow;}
 [StructLayout(LayoutKind.Sequential)] struct TagInfo {public uint Attributes,Tag;}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern SafeFileHandle CreateFileW(string p,uint access,uint share,IntPtr security,uint disposition,uint flags,IntPtr template);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool GetFileInformationByHandle(SafeFileHandle h,out Info i);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool GetFileInformationByHandleEx(SafeFileHandle h,int kind,out Standard i,uint size);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool GetFileInformationByHandleEx(SafeFileHandle h,int kind,out TagInfo i,uint size);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool SetFileInformationByHandle(SafeFileHandle h,int kind,byte[] data,uint size);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern bool GetDiskFreeSpaceExW(string p,out ulong available,out ulong total,out ulong free);
 static string Long(string p)=>@"\\?\"+System.IO.Path.GetFullPath(p);
 static string Identity(Info i)=>i.Volume.ToString("X")+":"+i.IndexHigh.ToString("X")+":"+i.IndexLow.ToString("X");
 static void Check(bool ok){if(!ok)throw new IOException("Win32 error "+Marshal.GetLastWin32Error());}
 public static ulong Free(){ulong a,t,f;Check(GetDiskFreeSpaceExW("C:\\",out a,out t,out f));return f;}
 public static void CheckAncestor(string p){
  using var h=CreateFileW(Long(p),0,7,IntPtr.Zero,3,0x02200000,IntPtr.Zero);Check(!h.IsInvalid);TagInfo t;Check(GetFileInformationByHandleEx(h,9,out t,(uint)Marshal.SizeOf<TagInfo>()));
  if((t.Attributes&0x441000)!=0)throw new IOException("Cloud recall/offline ancestor");
  if((t.Attributes&1024)!=0 && ((t.Tag&0xffff0fff)!=0x9000001a || (t.Tag&0x20000000)!=0))throw new IOException("Junction/symlink/unknown reparse ancestor");
 }
 public static QuestDiskScan Scan(string root){
  var result=new QuestDiskScan();var stack=new Stack<string>();stack.Push(System.IO.Path.GetFullPath(root));
  if(File.Exists(root)){try{string p=System.IO.Path.GetFullPath(root);using var h=CreateFileW(Long(p),0,7,IntPtr.Zero,3,0x00200000,IntPtr.Zero);Check(!h.IsInvalid);Info i;Standard s;Check(GetFileInformationByHandle(h,out i));Check(GetFileInformationByHandleEx(h,1,out s,(uint)Marshal.SizeOf<Standard>()));if((i.Attributes&0x441400)!=0)result.Unknown.Add(p+": reparse/cloud file");else result.Files.Add(new QuestDiskFile{Path=p,Bytes=s.Length,Allocated=s.Allocation,Links=s.Links,Id=Identity(i),Attributes=i.Attributes,Modified=File.GetLastWriteTimeUtc(p)});}catch(Exception e){result.Unknown.Add(root+": "+e.Message);}return result;}
  while(stack.Count>0){string p=stack.Pop();try{var di=new DirectoryInfo(p);if(((long)di.Attributes&0x441400)!=0){result.Unknown.Add(p+": reparse/cloud directory");continue;}result.Directories.Add(di.FullName);
   foreach(var entry in di.EnumerateFileSystemInfos()){if(entry is DirectoryInfo){stack.Push(entry.FullName);continue;}
    using var h=CreateFileW(Long(entry.FullName),0,7,IntPtr.Zero,3,0x00200000,IntPtr.Zero);Check(!h.IsInvalid);Info i;Standard s;Check(GetFileInformationByHandle(h,out i));Check(GetFileInformationByHandleEx(h,1,out s,(uint)Marshal.SizeOf<Standard>()));
    if((i.Attributes&0x441400)!=0){result.Unknown.Add(entry.FullName+": reparse/cloud file");continue;}
    result.Files.Add(new QuestDiskFile{Path=entry.FullName,Bytes=s.Length,Allocated=s.Allocation,Links=s.Links,Id=Identity(i),Attributes=i.Attributes,Modified=entry.LastWriteTimeUtc});
   }
  }catch(Exception e){result.Unknown.Add(p+": "+e.Message);}}
  return result;
 }
 public static QuestDiskFile[] Owned(QuestDiskScan scan,string owner,string[] children){
  owner=System.IO.Path.GetFullPath(owner).TrimEnd('\\','/');var files=new List<QuestDiskFile>();foreach(var f in scan.Files){if(!f.Path.StartsWith(owner+System.IO.Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))continue;bool child=false;foreach(var c in children){if(f.Path.StartsWith(System.IO.Path.GetFullPath(c).TrimEnd('\\','/')+System.IO.Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase)){child=true;break;}}if(!child)files.Add(f);}return files.ToArray();
 }
 public static string Hash(string p){using var s=File.OpenRead(Long(p));return Convert.ToHexString(SHA256.HashData(s)).ToLowerInvariant();}
 public static string Hash512(string p){using var s=File.OpenRead(Long(p));return Convert.ToHexString(SHA512.HashData(s)).ToLowerInvariant();}
 public static void Probe(string p){using var h=CreateFileW(Long(p),0,0,IntPtr.Zero,3,0x00200000,IntPtr.Zero);Check(!h.IsInvalid);}
 // Hold a non-sharing handle through hash validation and delete disposition.
 public static void DeleteVerified(string p,string expectedId,string sha256){
  using var h=CreateFileW(Long(p),0x80010000,0,IntPtr.Zero,3,0x00200000,IntPtr.Zero);Check(!h.IsInvalid);
  Info i;Check(GetFileInformationByHandle(h,out i));if((i.Attributes&0x441400)!=0||Identity(i)!=expectedId)throw new IOException("File identity/reparse/cloud changed");
  using var stream=new FileStream(h,FileAccess.Read);if(Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant()!=sha256)throw new IOException("Artifact bytes changed");
  Check(SetFileInformationByHandle(h,4,BitConverter.GetBytes(1),4));
 }
}
